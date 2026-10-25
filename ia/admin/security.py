"""Backend identity context and local internal-service authentication."""

import hmac
import os
from pathlib import Path

PERMISSIONS = {
    "overview": "analytics:read", "map": "analytics:read",
    "composition": "analytics:read", "coverage": "analytics:read",
    "prices": "prices:read", "attendance": "attendance:read",
    "reports": "reports:read", "managers": "managers:read",
}


class AdminAccessError(PermissionError):
    pass


class AdminConfigurationError(RuntimeError):
    pass


def authorized_markets(snapshot, authorization):
    if not isinstance(authorization, dict) or authorization.get("role") != "admin":
        raise AdminAccessError("Se requiere un contexto administrativo autenticado por backend.")
    if not isinstance(authorization.get("actor_id"), str) or not authorization["actor_id"].strip():
        raise AdminAccessError("Falta la identidad de backend.")
    ids, permissions = authorization.get("allowed_tianguis_ids"), authorization.get("permissions")
    if not isinstance(ids, list) or not ids or len(ids) > 1000 or any(not isinstance(value, str) or not value for value in ids):
        raise AdminAccessError("El alcance de tianguis debe ser explícito.")
    if not isinstance(permissions, list) or any(not isinstance(value, str) for value in permissions):
        raise AdminAccessError("Se requieren permisos de consulta explícitos.")
    if not isinstance(snapshot, dict) or not isinstance(snapshot.get("tianguis"), list):
        raise ValueError("Se requiere un snapshot estructurado de tianguis.")
    return [market for market in snapshot["tianguis"] if isinstance(market, dict) and market.get("id") in set(ids)]


def check_action(action, authorization):
    if action not in PERMISSIONS or PERMISSIONS[action] not in authorization.get("permissions", []):
        raise AdminAccessError("Tu alcance no permite esta consulta administrativa.")


def verify_internal_token(supplied):
    token = os.environ.get("IA_INTERNAL_TOKEN", "").strip()
    if not token:
        path = Path(__file__).resolve().parents[1] / ".env"
        if path.is_file():
            for line in path.read_text(encoding="utf-8-sig").splitlines():
                key, separator, value = line.partition("=")
                if separator and key.strip() == "IA_INTERNAL_TOKEN":
                    token = value.strip().strip("\"'")
    if len(token) < 24:
        raise AdminConfigurationError("Configura IA_INTERNAL_TOKEN en el servicio y en backend; no lo envíes a frontend.")
    if not isinstance(supplied, str) or not hmac.compare_digest(token.encode("utf-8"), supplied.encode("utf-8")):
        raise AdminAccessError("Acceso al servicio administrativo no autorizado.")
