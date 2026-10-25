import copy
from datetime import datetime
from decimal import Decimal
from pathlib import Path
import sys
import unittest
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ia.backend_adapter import BackendAdapterError, build_recommendation_payload
from ia.recommender import recommend


class BackendAdapterTests(unittest.TestCase):
    def setUp(self):
        self.offer = {
            "id": "offer-1", "id_merchant": "merchant-1", "negocio": "Cocina Demo",
            "producto": "Comida corrida", "precio_declarado": 65.10,
            "unidad": "comida", "horario": "Domingos de 8 a 18",
            "descripcion": "Texto libre que no se entrega al modelo",
            "ubicacion": {"lat": 19.3, "lng": -99.1, "direccion": "No inferir tianguis desde aquí"},
            "estado": "publicada", "vigente_hasta": "2026-10-25T18:00:00-06:00",
            "confirmado_en": "2026-10-25T09:00:00-06:00",
            "password": "must-not-be-copied", "reportes_privados": ["must-not-be-copied"],
        }
        self.context = {
            "tianguis_id": "market-sunday", "business_active": True,
            "participation": {"id": "part-sunday", "business_id": "merchant-1", "tianguis_id": "market-sunday", "status": "approved", "weekdays": [7], "location_label": "Pasillo A, puesto 2", "password": "must-not-be-copied"},
            "session": {"id": "session-sunday", "tianguis_id": "market-sunday", "starts_at": "2026-10-25T08:00:00-06:00", "ends_at": "2026-10-25T18:00:00-06:00", "manager_private_notes": "must-not-be-copied"},
        }
        self.placements = {"merchant-1": [self.context]}
        self.args = {"query": "Tengo $100 y quiero comer", "tianguis_id": "market-sunday", "as_of": "2026-10-25T10:30:00-06:00", "placements": self.placements, "is_demo": True, "budget_cents": 10000}

    def build(self, offers=None, **changes):
        return build_recommendation_payload([self.offer] if offers is None else offers, **{**self.args, **changes})

    def test_mapping_exact_cents_and_whitelist_without_mutating_inputs(self):
        original_offer, original_placements = copy.deepcopy(self.offer), copy.deepcopy(self.placements)
        result = self.build()
        row = result["payload"]["offers"][0]
        self.assertEqual(row["name"], "Comida corrida")
        self.assertEqual(row["price_cents"], 6510)
        self.assertEqual(row["business_id"], "merchant-1")
        self.assertEqual(row["status"], "published")
        self.assertEqual(row["visibility"], "public")
        self.assertIsNone(row["category"])
        self.assertEqual(row["participation"]["location_label"], "Pasillo A, puesto 2")
        self.assertNotIn("must-not-be-copied", str(result))
        self.assertNotIn("descripcion", row)
        self.assertNotIn("ubicacion", row)
        self.assertEqual(original_offer, self.offer)
        self.assertEqual(original_placements, self.placements)

    def test_non_published_states_are_rejected(self):
        for state in ("agotada", "suspendida", "vencida", "borrador", None):
            with self.subTest(state=state):
                self.offer["estado"] = state
                result = self.build()
                self.assertEqual(result["payload"]["offers"], [])
                self.assertEqual(result["rejected"][0]["reason"], "not_published")

    def test_naive_offer_dates_are_rejected(self):
        for field in ("confirmado_en", "vigente_hasta"):
            original = self.offer[field]
            self.offer[field] = "2026-10-25T10:00:00"
            self.assertEqual(self.build()["rejected"][0]["reason"], "invalid_dates")
            self.offer[field] = original

    def test_aware_datetime_objects_from_pydantic_are_supported(self):
        for field in ("confirmado_en", "vigente_hasta"):
            self.offer[field] = datetime.fromisoformat(self.offer[field])
        for field in ("starts_at", "ends_at"):
            self.context["session"][field] = datetime.fromisoformat(self.context["session"][field])
        result = self.build(as_of=datetime.fromisoformat(self.args["as_of"]))
        self.assertEqual(len(result["payload"]["offers"]), 1)
        self.assertEqual(result["payload"]["offers"][0]["confirmed_at"], "2026-10-25T09:00:00-06:00")

    def test_model_dump_objects_can_be_adapted_without_pydantic_dependency(self):
        class FakeModel:
            def __init__(self, data):
                self.data = data
            def model_dump(self, mode):
                return self.data
        result = self.build(offers=[FakeModel(self.offer)])
        self.assertEqual(len(result["payload"]["offers"]), 1)

    def test_expiry_boundary_and_future_confirmation_are_rejected(self):
        self.offer["vigente_hasta"] = self.args["as_of"]
        self.assertEqual(self.build()["rejected"][0]["reason"], "expired_offer")
        self.offer["vigente_hasta"] = "2026-10-25T18:00:00-06:00"
        self.offer["confirmado_en"] = "2026-10-25T11:00:00-06:00"
        self.assertEqual(self.build()["rejected"][0]["reason"], "future_confirmation")

    def test_price_null_bool_negative_nonfinite_and_subcent_are_rejected(self):
        for price in (None, True, -1, float("inf"), float("nan"), Decimal("NaN"), 65.101, Decimal("1.0000000000000000000000000000000000001")):
            with self.subTest(price=price):
                self.offer["precio_declarado"] = price
                self.assertEqual(self.build()["payload"]["offers"], [])
        self.offer["precio_declarado"] = Decimal("65.001")
        self.assertEqual(self.build()["rejected"][0]["reason"], "subcent_price")

    def test_zero_and_binary_float_common_prices_are_exact(self):
        for price, cents in ((0, 0), (0.29, 29), (65.1, 6510), (Decimal("85.00"), 8500)):
            self.offer["precio_declarado"] = price
            self.assertEqual(self.build()["payload"]["offers"][0]["price_cents"], cents)

    def test_missing_placement_does_not_infer_market_from_coordinates(self):
        result = self.build(placements={})
        self.assertEqual(result["payload"]["offers"], [])
        self.assertEqual(result["rejected"][0]["reason"], "missing_placement")
        self.assertTrue(result["warnings"])

    def test_backend_translation_reaches_recommender_with_exact_budget(self):
        adapted = self.build()
        result = recommend(adapted["payload"], mode="mock")
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["recommendations"][0]["offer_id"], "offer-1")
        self.assertEqual(result["recommendations"][0]["total_cents"], 6510)
        self.assertEqual(result["recommendations"][0]["remaining_cents"], 3490)
        missing = self.build(placements={})
        self.assertEqual(recommend(missing["payload"], mode="mock")["status"], "no_match")

    def test_matching_market_and_current_session_are_required(self):
        self.context["tianguis_id"] = "other-market"
        self.assertEqual(self.build()["rejected"][0]["reason"], "no_active_placement")

    def test_same_merchant_can_select_another_market_on_another_day(self):
        monday = copy.deepcopy(self.context)
        monday["tianguis_id"] = "market-monday"
        monday["participation"].update(id="part-monday", tianguis_id="market-monday", weekdays=[1], location_label="Pasillo B, puesto 9")
        monday["session"].update(id="session-monday", tianguis_id="market-monday", starts_at="2026-10-26T08:00:00-06:00", ends_at="2026-10-26T18:00:00-06:00")
        self.placements["merchant-1"].append(monday)
        sunday = self.build()["payload"]["offers"][0]
        self.assertEqual(sunday["participation"]["id"], "part-sunday")
        self.offer.update(confirmado_en="2026-10-26T09:00:00-06:00", vigente_hasta="2026-10-26T18:00:00-06:00")
        result = self.build(tianguis_id="market-monday", as_of="2026-10-26T10:30:00-06:00")
        self.assertEqual(result["payload"]["offers"][0]["business_id"], sunday["business_id"])
        self.assertEqual(result["payload"]["offers"][0]["participation"]["location_label"], "Pasillo B, puesto 9")

    def test_duplicate_active_contexts_are_ambiguous(self):
        self.placements["merchant-1"].append(copy.deepcopy(self.context))
        self.assertEqual(self.build()["rejected"][0]["reason"], "ambiguous_placement")

    def test_overnight_context_uses_start_day_in_mexico_city(self):
        self.context["participation"]["weekdays"] = [6]
        self.context["session"].update(starts_at="2026-10-24T23:00:00-06:00", ends_at="2026-10-25T02:00:00-06:00")
        self.offer.update(confirmado_en="2026-10-24T22:00:00-06:00", vigente_hasta="2026-10-25T02:00:00-06:00")
        result = self.build(as_of="2026-10-25T07:00:00Z")
        self.assertEqual(result["rejected"], [])
        self.assertEqual(result["payload"]["offers"][0]["participation"]["weekdays"], [6])

    def test_capacity_limit_is_explicit_in_rejections(self):
        offers = [{**self.offer, "id": "offer-" + str(index)} for index in range(101)]
        result = self.build(offers=offers)
        self.assertEqual(len(result["payload"]["offers"]), 100)
        self.assertEqual(result["rejected"], [{"offer_id": "offer-100", "reason": "recommendation_capacity_exceeded"}])

    def test_approval_activity_identity_weekday_and_session_are_enforced(self):
        mutations = [
            lambda c: c.update(business_active=False),
            lambda c: c["participation"].update(status="pending"),
            lambda c: c["participation"].update(business_id="another-merchant"),
            lambda c: c["participation"].update(weekdays=[1]),
            lambda c: c["session"].update(ends_at="2026-10-27T18:00:00-06:00"),
            lambda c: c["session"].update(starts_at="2026-10-25T08:00:00"),
            lambda c: c["session"].update(ends_at=self.args["as_of"]),
        ]
        for mutate in mutations:
            context = copy.deepcopy(self.context)
            mutate(context)
            result = self.build(placements={"merchant-1": [context]})
            self.assertEqual(result["payload"]["offers"], [])

    def test_provenance_is_explicit_and_not_inferred_from_names(self):
        self.offer["negocio"] = "Real, no demo"
        self.assertTrue(self.build(is_demo=True)["payload"]["offers"][0]["is_demo"])
        self.assertFalse(self.build(is_demo=False)["payload"]["offers"][0]["is_demo"])
        with self.assertRaises(BackendAdapterError):
            self.build(is_demo="true")

    def test_invalid_top_level_values_fail_clearly(self):
        for changes in ({"as_of": "2026-10-25T10:30:00"}, {"query": ""}, {"budget_cents": True}, {"placements": []}):
            with self.subTest(changes=changes):
                with self.assertRaises(BackendAdapterError):
                    self.build(**changes)

    def test_uuid_and_integer_identifiers_are_canonical_strings(self):
        merchant = UUID("12345678-1234-5678-1234-567812345678")
        self.offer.update(id=42, id_merchant=merchant)
        self.context["participation"]["business_id"] = merchant
        result = self.build(placements={merchant: [self.context]})
        row = result["payload"]["offers"][0]
        self.assertEqual(row["id"], "42")
        self.assertEqual(row["business_id"], str(merchant))


if __name__ == "__main__":
    unittest.main()
