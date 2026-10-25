"""Run the synthetic tianguis example; --live explicitly consumes Claude API."""

import argparse
import json
from pathlib import Path
import sys

from claude_client import ClaudeAPIError
from recommender import RecommendationError, recommend


def main():
    parser = argparse.ArgumentParser(description="Recomendador de prueba con presupuesto y jornadas de tianguis.")
    parser.add_argument("--live", action="store_true", help="Una llamada real a Haiku high; requiere ia/.env.")
    parser.add_argument("--input", type=Path, default=Path(__file__).parent / "data" / "tianguis_demo.json")
    parser.add_argument("--output", type=Path, help="Guardar resultado sin claves; usar sólo datos autorizados o sintéticos.")
    args = parser.parse_args()
    try:
        payload = json.loads(args.input.read_text(encoding="utf-8"))
        result = recommend(payload, mode="live" if args.live else "mock")
        output = json.dumps(result, ensure_ascii=False, indent=2)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(output + "\n", encoding="utf-8")
        print(output)
        return 0
    except (RecommendationError, ClaudeAPIError, OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
