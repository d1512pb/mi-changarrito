import copy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from claude_client import ClaudeClient, Credentials
from recommender import RecommendationError, recommend


class Selector:
    def __init__(self, selection=None, stop_reason="end_turn"):
        self.selection = selection
        self.stop_reason = stop_reason
        self.catalog = None

    def select_offers(self, query, budget, catalog):
        self.catalog = copy.deepcopy(catalog)
        selection = self.selection or {"status": "ok", "selected_offer_ids": [catalog[0]["offer_id"]], "clarification": None}
        return {"model": "claude-haiku-5-5", "stop_reason": self.stop_reason,
                "content": [{"type": "text", "text": json.dumps(selection)}],
                "usage": {"input_tokens": 100, "output_tokens": 30}}


class RecommendationTests(unittest.TestCase):
    def setUp(self):
        self.payload = json.loads((Path(__file__).resolve().parents[1] / "data" / "tianguis_demo.json").read_text(encoding="utf-8"))

    def ids(self, result):
        return [item["offer_id"] for item in result["recommendations"]]

    def only_first(self):
        self.payload["offers"] = [self.payload["offers"][0]]
        return self.payload["offers"][0]

    def test_budget_and_alternatives_use_source_prices(self):
        result = recommend(self.payload)
        self.assertEqual(self.ids(result), ["demo-comida-65", "demo-comida-85"])
        self.assertEqual([item["remaining_cents"] for item in result["recommendations"]], [3500, 1500])
        self.assertEqual(result["metrics"]["generation_requests"], 0)

    def test_same_business_has_different_market_price_and_day(self):
        self.payload.update(tianguis_id="demo-tianguis-002", as_of="2026-10-26T10:30:00-06:00")
        result = recommend(self.payload)
        self.assertEqual(self.ids(result), ["demo-misma-cocina-otro-tianguis"])
        self.assertEqual(result["recommendations"][0]["business_id"], "demo-puesto-01")
        self.assertEqual(result["recommendations"][0]["price_cents"], 8500)
        self.assertEqual(result["recommendations"][0]["location_label"], "Tianguis de lunes, pasillo B, puesto 9")

    def test_business_in_another_market_is_not_available_on_sunday(self):
        self.payload["tianguis_id"] = "demo-tianguis-002"
        self.assertEqual(recommend(self.payload)["status"], "no_match")

    def test_wrong_weekday_is_excluded(self):
        offer = self.only_first()
        offer["participation"]["weekdays"] = [1]
        self.assertEqual(recommend(self.payload)["status"], "no_match")

    def test_utc_date_uses_mexico_city_session_day(self):
        offer = self.only_first()
        self.payload["as_of"] = "2026-10-26T02:30:00Z"
        offer["session"]["ends_at"] = "2026-10-25T22:00:00-06:00"
        offer["valid_until"] = "2026-10-25T23:00:00-06:00"
        self.assertEqual(self.ids(recommend(self.payload)), [offer["id"]])

    def test_overnight_session_belongs_to_start_day(self):
        offer = self.only_first()
        self.payload["as_of"] = "2026-10-25T01:00:00-06:00"
        offer["participation"]["weekdays"] = [6]
        offer["session"].update(starts_at="2026-10-24T23:00:00-06:00", ends_at="2026-10-25T02:00:00-06:00")
        offer.update(confirmed_at="2026-10-24T22:00:00-06:00", valid_until="2026-10-25T02:00:00-06:00")
        self.assertEqual(self.ids(recommend(self.payload)), [offer["id"]])

    def test_expiration_and_session_close_are_exclusive(self):
        offer = self.only_first()
        offer["valid_until"] = self.payload["as_of"]
        self.assertEqual(recommend(self.payload)["status"], "no_match")
        offer["valid_until"] = "2026-10-25T18:00:00-06:00"
        offer["session"]["ends_at"] = self.payload["as_of"]
        self.assertEqual(recommend(self.payload)["status"], "no_match")

    def test_multiday_session_cannot_bypass_approved_weekday(self):
        offer = self.only_first()
        self.payload["as_of"] = "2026-10-26T10:30:00-06:00"
        offer["session"]["ends_at"] = "2026-10-27T18:00:00-06:00"
        offer["valid_until"] = "2026-10-27T18:00:00-06:00"
        self.assertFalse(recommend(self.payload)["recommendations"])

    def test_unknown_or_invalid_prices_do_not_pass(self):
        offer = self.only_first()
        for value in (None, "6500", False, -1, 6500.5):
            with self.subTest(price=value):
                offer["price_cents"] = value
                self.assertEqual(recommend(self.payload)["status"], "insufficient_data")

    def test_confirmed_zero_price_is_valid(self):
        self.only_first()["price_cents"] = 0
        self.assertEqual(recommend(self.payload)["recommendations"][0]["remaining_cents"], 10000)

    def test_private_unapproved_and_inactive_business_are_excluded(self):
        for field, value in (("visibility", "private"), ("business_active", False), ("status", "draft")):
            with self.subTest(field=field):
                offer = self.only_first()
                old = offer[field]
                offer[field] = value
                self.assertEqual(recommend(self.payload)["status"], "no_match")
                offer[field] = old
        self.payload["offers"][0]["participation"]["status"] = "pending"
        self.assertEqual(recommend(self.payload)["status"], "no_match")

    def test_missing_session_cannot_be_inferred_from_business(self):
        del self.only_first()["session"]
        self.assertEqual(recommend(self.payload)["status"], "insufficient_data")

    def test_duplicate_offer_ids_are_not_used(self):
        offer = self.only_first()
        self.payload["offers"].append(copy.deepcopy(offer))
        self.assertFalse(recommend(self.payload)["recommendations"])

    def test_money_can_be_read_from_query(self):
        del self.payload["budget_cents"]
        self.assertEqual(recommend(self.payload)["budget_cents"], 10000)

    def test_ambiguous_budget_needs_clarification(self):
        del self.payload["budget_cents"]
        self.payload["query"] = "¿Con $100 o $200 qué puedo comer?"
        result = recommend(self.payload)
        self.assertEqual(result["status"], "needs_clarification")
        self.assertEqual(result["metrics"]["generation_requests"], 0)

    def test_boolean_budget_and_naive_clock_are_rejected(self):
        self.payload["budget_cents"] = True
        with self.assertRaises(RecommendationError):
            recommend(self.payload)
        self.payload["budget_cents"] = 10000
        self.payload["as_of"] = "2026-10-25T10:30:00"
        with self.assertRaises(RecommendationError):
            recommend(self.payload)

    def test_model_receives_only_filtered_public_rows(self):
        selector = Selector()
        result = recommend(self.payload, mode="live", client=selector)
        self.assertEqual([item["offer_id"] for item in selector.catalog], ["demo-comida-65", "demo-comida-85"])
        self.assertEqual(result["metrics"]["effort"], "high")

    def test_hallucinated_or_duplicate_ids_are_rejected(self):
        for ids in (["unknown"], ["demo-comida-65", "demo-comida-65"], ["demo-comida-120"]):
            with self.subTest(ids=ids):
                selector = Selector({"status": "ok", "selected_offer_ids": ids, "clarification": None})
                with self.assertRaises(RecommendationError):
                    recommend(self.payload, mode="live", client=selector)

    def test_truncated_output_is_not_used(self):
        with self.assertRaises(RecommendationError):
            recommend(self.payload, mode="live", client=Selector(stop_reason="max_tokens"))

    def test_malformed_model_status_is_a_controlled_error(self):
        selector = Selector({"status": [], "selected_offer_ids": [], "clarification": None})
        with self.assertRaises(RecommendationError):
            recommend(self.payload, mode="live", client=selector)

    def test_high_effort_request_is_bounded_and_structured(self):
        class Opener:
            def open(self, request, timeout):
                self.request = request
                raise RuntimeError("request captured without network")
        opener = Opener()
        client = ClaudeClient(Credentials("test-key"), opener=opener)
        with self.assertRaises(RuntimeError):
            client.select_offers("Quiero comer", 10000, [])
        payload = json.loads(opener.request.data)
        self.assertEqual(payload["output_config"]["effort"], "high")
        self.assertEqual(payload["thinking"]["type"], "adaptive")
        self.assertEqual(payload["max_tokens"], 2048)
        self.assertEqual(payload["output_config"]["format"]["type"], "json_schema")
        self.assertNotIn("tools", payload)


if __name__ == "__main__":
    unittest.main()
