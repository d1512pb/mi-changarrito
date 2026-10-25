"""Small Claude API client for internal, bounded-cost connectivity checks."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

API_ROOT = "https://api.anthropic.com"
API_VERSION = "2026-10-21"
SMOKE_MODEL = "claude-haiku-5-5"
SMOKE_MAX_TOKENS = 32


class ClaudeAPIError(RuntimeError):
    """An actionable error that never includes credentials or provider payloads."""


@dataclass(frozen=True)
class Credentials:
    api_key: str = field(repr=False)
    workspace_id: str = field(default="", repr=False)


def load_credentials(env_file: Path | None = None, environ=None) -> Credentials:
    """Read only this area's local .env, with process environment taking priority."""
    environment = os.environ if environ is None else environ
    env_file = env_file or Path(__file__).with_name(".env")
    values = {}
    if env_file.is_file():
        for line in env_file.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key, value = key.strip(), value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            if key in {"ANTHROPIC_API_KEY", "ANTHROPIC_WORKSPACE_ID"}:
                values[key] = value
    api_key = environment.get("ANTHROPIC_API_KEY", values.get("ANTHROPIC_API_KEY", "")).strip()
    workspace_id = environment.get("ANTHROPIC_WORKSPACE_ID", values.get("ANTHROPIC_WORKSPACE_ID", "")).strip()
    if not api_key:
        raise ClaudeAPIError("Falta ANTHROPIC_API_KEY en ia/.env o en el entorno. No pegues la clave en el chat.")
    if any(character in api_key + workspace_id for character in "\r\n"):
        raise ClaudeAPIError("La configuración de acceso contiene un salto de línea inválido.")
    return Credentials(api_key, workspace_id)


def smoke_payload() -> dict:
    return {
        "model": SMOKE_MODEL,
        "max_tokens": SMOKE_MAX_TOKENS,
        "thinking": {"type": "disabled"},
        "output_config": {"effort": "low"},
        "messages": [{"role": "user", "content": "Responde exactamente OK."}],
    }


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class ClaudeClient:
    """Fixed official endpoint, one attempt per request, no model fallback."""

    def __init__(self, credentials: Credentials, opener=None, timeout: float = 20):
        self._credentials = credentials
        self._opener = opener if opener is not None else build_opener(_NoRedirect())
        self._timeout = timeout

    def _request(self, path: str, payload: dict | None = None) -> dict:
        headers = {
            "Authorization": "Bearer " + self._credentials.api_key,
            "anthropic-version": API_VERSION,
            "content-type": "application/json",
        }
        if self._credentials.workspace_id:
            headers["anthropic-workspace-id"] = self._credentials.workspace_id
        request = Request(
            API_ROOT + path,
            data=json.dumps(payload).encode("utf-8") if payload is not None else None,
            headers=headers,
            method="POST" if payload is not None else "GET",
        )
        try:
            with self._opener.open(request, timeout=self._timeout) as response:
                result = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            status = error.code
            detail = ""
            try:
                provider_error = json.loads(error.read(8192).decode("utf-8")).get("error", {})
                message = provider_error.get("message", "")
                if isinstance(message, str):
                    detail = message.replace(self._credentials.api_key, "[CLAVE OCULTA]")
                    detail = re.sub(r"sk-ant-[A-Za-z0-9_-]+", "[CLAVE OCULTA]", detail)
                    detail = " ".join(detail.split())[:400]
            except (ValueError, UnicodeError, AttributeError):
                pass
            error.close()
            explanations = {
                400: "Revisa la configuración del modelo o el workspace de la clave.",
                401: "La clave fue rechazada; revisa la cuenta y su vigencia.",
                402: "Revisa el saldo de la cuenta.",
                403: "La cuenta o clave no tiene acceso a este recurso.",
                404: "El modelo económico no está disponible para esta cuenta; no se usará otro automáticamente.",
                429: "Se alcanzó un límite de uso; la prueba no reintenta automáticamente.",
            }
            explanation = explanations.get(status, "La prueba se detuvo sin reintentos.")
            raise ClaudeAPIError(f"Claude respondió HTTP {status} en {path}. {explanation}" + (f" Detalle: {detail}" if detail else "")) from None
        except (URLError, TimeoutError, OSError):
            raise ClaudeAPIError("No fue posible conectar con Claude. La prueba se detuvo sin reintentos.") from None
        except (ValueError, UnicodeError):
            raise ClaudeAPIError("Claude devolvió una respuesta que no pudimos interpretar como JSON.") from None
        if not isinstance(result, dict):
            raise ClaudeAPIError("Claude devolvió una estructura inesperada.")
        return result

    def model_info(self) -> dict:
        return self._request("/v1/models/" + SMOKE_MODEL)

    def smoke_message(self) -> dict:
        return self._request("/v1/messages", smoke_payload())
