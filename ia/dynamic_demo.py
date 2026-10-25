"""Synthetic catalog changes; no application data or database is modified."""

import argparse
import copy
import json
from pathlib import Path
import sys

from claude_client import ClaudeAPIError
from recommender import RecommendationError, recommend


def run_dynamic_demo(payload, *, mode="mock", client=None):
    current = copy.deepcopy(payload)
    if current.get("is_demo") is not True or any(offer.get("is_demo") is not True for offer in current.get("offers", [])):
        raise RecommendationError("Esta demostración sólo acepta datos sintéticos identificados.")
    stages = []
    initial = recommend(current, mode=mode, client=client)
    if initial["status"] != "ok":
        raise RecommendationError("El escenario necesita al menos una opción inicial dentro del presupuesto.")
    stages.append({"stage": "initial", "changed_offer_ids": [], "result": initial})
    first_id = initial["recommendations"][0]["offer_id"]
    for offer in current["offers"]:
        if offer["id"] == first_id:
            offer["status"] = "sold_out"
    replacement = recommend(current, mode=mode, client=client)
    if any(item["offer_id"] == first_id for item in replacement["recommendations"]):
        raise RecommendationError("La demostración detectó que una oferta agotada siguió recomendándose.")
    stages.append({"stage": "first_offer_sold_out", "changed_offer_ids": [first_id], "result": replacement})
    exhausted = []
    for offer in current["offers"]:
        if offer.get("tianguis_id") == current["tianguis_id"] and offer.get("status") == "published" and type(offer.get("price_cents")) is int and offer["price_cents"] <= initial["budget_cents"]:
            offer["status"] = "sold_out"
            exhausted.append(offer["id"])
    no_match = recommend(current, mode=mode, client=client)
    if no_match["recommendations"]:
        raise RecommendationError("La demostración esperaba que no quedaran opciones factibles.")
    stages.append({"stage": "all_affordable_offers_sold_out", "changed_offer_ids": exhausted, "result": no_match})
    return {
        "scenario": "synthetic_catalog_update", "is_demo": True, "mode": mode,
        "application_data_modified": False, "stages": stages,
        "generation_requests": sum(stage["result"]["metrics"].get("generation_requests", 0) for stage in stages),
        "estimated_token_cost_usd": round(sum(stage["result"]["metrics"].get("estimated_token_cost_usd", 0) for stage in stages), 8),
    }


def main():
    parser = argparse.ArgumentParser(description="Demostración de agotamiento con catálogo sintético.")
    parser.add_argument("--live", action="store_true", help="Hasta dos llamadas reales a Haiku high; de otro modo no consume API.")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        source = Path(__file__).parent / "data" / "tianguis_demo.json"
        report = run_dynamic_demo(json.loads(source.read_text(encoding="utf-8")), mode="live" if args.live else "mock")
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        summary = {
            "scenario": report["scenario"], "mode": report["mode"],
            "application_data_modified": False,
            "stages": [{"stage": stage["stage"], "status": stage["result"]["status"],
                        "offer_ids": [offer["offer_id"] for offer in stage["result"]["recommendations"]]} for stage in report["stages"]],
            "generation_requests": report["generation_requests"],
            "estimated_token_cost_usd": report["estimated_token_cost_usd"],
        }
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 0
    except (RecommendationError, ClaudeAPIError, OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
