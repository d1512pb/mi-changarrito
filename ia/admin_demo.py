"""Synthetic admin chat/dashboard; no production data or account permissions."""

import argparse
import json
from pathlib import Path
import sys

from admin.chat import admin_chat
from admin.dashboard import admin_dashboard
from admin.security import AdminAccessError, PERMISSIONS
from claude_client import ClaudeAPIError


def demo_authorization(snapshot):
    if snapshot.get("is_demo") is not True:
        raise ValueError("La identidad automática de demo sólo acepta datos sintéticos.")
    return {"role": "admin", "actor_id": "demo-admin-001", "allowed_tianguis_ids": [market["id"] for market in snapshot["tianguis"]], "permissions": sorted(set(PERMISSIONS.values()))}


def main():
    parser = argparse.ArgumentParser(description="Chat administrativo y dashboard con snapshot sintético.")
    parser.add_argument("--query", default="Compara los precios del jitomate entre tianguis este mes")
    parser.add_argument("--dashboard", action="store_true", help="Calcula todas las secciones autorizadas sin consultar a Claude.")
    parser.add_argument("--live", action="store_true", help="Una llamada a Haiku high para interpretar la pregunta; cálculos por código.")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--summary", action="store_true", help="Muestra sólo respuesta, métricas y tamaño del resultado; --output conserva el JSON completo.")
    args = parser.parse_args()
    try:
        snapshot = json.loads((Path(__file__).parent / "data" / "admin_snapshot_demo.json").read_text(encoding="utf-8"))
        payload = {"query": args.query, "snapshot": snapshot, "authorization": demo_authorization(snapshot)}
        result = admin_dashboard(payload) if args.dashboard else admin_chat(payload, mode="live" if args.live else "mock")
        rendered = json.dumps(result, ensure_ascii=False, indent=2)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(rendered + "\n", encoding="utf-8")
        if args.summary:
            summary = {key: result[key] for key in ("mode", "status", "answer", "metrics") if key in result}
            if isinstance(result.get("data"), dict) and "action" in result["data"]:
                summary["action"] = result["data"]["action"]
                summary["rows"] = len(result["data"].get("rows", []))
                summary["charts"] = len(result["data"].get("charts", []))
            if isinstance(result.get("data"), dict) and "sections" in result["data"]:
                summary["sections"] = list(result["data"]["sections"])
                summary["deferred_features"] = result["data"].get("deferred_features", [])
            print(json.dumps(summary, ensure_ascii=False, indent=2))
        else:
            print(rendered)
        return 0
    except (ValueError, AdminAccessError, ClaudeAPIError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
