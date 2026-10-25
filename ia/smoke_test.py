"""One short real Claude call; --dry-run never connects to the network."""

from __future__ import annotations

import argparse
import json
import sys
import time

from claude_client import ClaudeAPIError, ClaudeClient, SMOKE_MODEL, load_credentials, smoke_payload

# Standard short-prompt rates checked against Anthropic docs on 2026-10-25.
INPUT_USD_PER_MILLION = 0.10
OUTPUT_USD_PER_MILLION = 0.50


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Prueba mínima de Claude Haiku con salida máxima de 32 tokens.")
    parser.add_argument("--dry-run", action="store_true", help="Muestra la petición sin clave, red ni consumo de API.")
    args = parser.parse_args(argv)
    if args.dry_run:
        print(json.dumps({"mode": "dry_run", "request": smoke_payload()}, ensure_ascii=False, indent=2))
        return 0

    try:
        client = ClaudeClient(load_credentials())
        model = client.model_info()
        if model.get("id") != SMOKE_MODEL:
            raise ClaudeAPIError("No se pudo confirmar acceso al modelo económico. No se generó una respuesta.")
        started = time.perf_counter()
        response = client.smoke_message()
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        text = "".join(block.get("text", "") for block in response.get("content", []) if block.get("type") == "text").strip()
        if not text:
            raise ClaudeAPIError("La llamada no produjo texto utilizable. No se repitió automáticamente.")
        usage = response.get("usage", {})
        input_tokens, output_tokens = usage.get("input_tokens"), usage.get("output_tokens")
        known_usage = all(type(value) is int and value >= 0 for value in (input_tokens, output_tokens))
        cost = round((input_tokens * INPUT_USD_PER_MILLION + output_tokens * OUTPUT_USD_PER_MILLION) / 1_000_000, 8) if known_usage else None
        # Restrict the displayed output to the requested marker; never print arbitrary payloads.
        result = {
            "mode": "live",
            "connected": True,
            "model": response.get("model", SMOKE_MODEL),
            "expected_ok_received": text.rstrip(".").upper() == "OK",
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "estimated_token_cost_usd": cost,
            "latency_ms": elapsed_ms,
            "stop_reason": response.get("stop_reason"),
            "generation_requests": 1,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except ClaudeAPIError as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
