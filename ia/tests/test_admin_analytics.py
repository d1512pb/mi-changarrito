import copy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ia.admin.analytics import AdminAnalyticsError, analyze, dashboard


class AdminAnalyticsTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = json.loads((Path(__file__).resolve().parents[1] / "data" / "admin_snapshot_demo.json").read_text(encoding="utf-8"))
        self.auth = {"role": "admin", "actor_id": "admin-demo", "allowed_tianguis_ids": ["t-centro", "t-oriente", "t-parque"],
                     "permissions": ["analytics:read", "prices:read", "attendance:read", "reports:read", "managers:read"]}

    def call(self, action, **filters):
        return analyze(self.snapshot, {"action": action, **filters}, self.auth)

    def saladette(self, result):
        return [row for row in result["rows"] if row["article_id"] == "jitomate" and row["variant"] == "saladette"]

    def test_unique_businesses_and_participations_are_distinct(self):
        result = self.call("overview")
        self.assertEqual(result["metrics"]["tianguis_count"], 3)
        self.assertEqual(result["metrics"]["unique_businesses"], 6)
        self.assertEqual(result["metrics"]["approved_participations"], 7)
        self.assertEqual({row["tianguis_id"]: row["unique_businesses"] for row in result["rows"]}, {"t-centro": 3, "t-oriente": 3, "t-parque": 1})

    def test_scope_is_applied_before_statistics_and_source_rows(self):
        self.auth["allowed_tianguis_ids"] = ["t-oriente"]
        result = self.call("prices")
        self.assertTrue(all(row["tianguis_id"] == "t-oriente" for row in result["rows"]))
        self.assertEqual(result["metrics"]["comparable_groups"], 0)
        self.assertNotIn("Tianguis Demo Centro", json.dumps(result))
        self.assertEqual(self.call("overview")["metrics"]["unique_businesses"], 3)

    def test_requested_market_outside_scope_is_rejected(self):
        self.auth["allowed_tianguis_ids"] = ["t-centro"]
        with self.assertRaises(AdminAnalyticsError):
            self.call("overview", tianguis_ids=["t-oriente"])

    def test_empty_allowed_scope_never_means_all(self):
        self.auth["allowed_tianguis_ids"] = []
        self.assertEqual(self.call("overview")["metrics"]["tianguis_count"], 0)

    def test_role_actor_and_permissions_are_required(self):
        for alteration in ({"role": "buyer"}, {"actor_id": ""}, {"permissions": []}):
            auth = {**self.auth, **alteration}
            with self.assertRaises(AdminAnalyticsError):
                analyze(self.snapshot, {"action": "prices"}, auth)

    def test_dashboard_omits_unauthorized_sections_and_manager_names(self):
        self.auth["permissions"] = ["analytics:read", "attendance:read", "reports:read"]
        result = dashboard(self.snapshot, {}, self.auth)
        self.assertNotIn("prices", result["sections"])
        self.assertNotIn("managers", result["sections"])
        self.assertNotIn("Gerente Demo", json.dumps(result))
        self.assertNotIn("manager_name", json.dumps(result))

    def test_dashboard_rejects_action_override(self):
        with self.assertRaises(AdminAnalyticsError):
            dashboard(self.snapshot, {"action": "prices"}, self.auth)

    def test_borough_filter_is_accent_insensitive(self):
        result = self.call("overview", borough="Coyoacán")
        self.assertEqual(result["metrics"]["tianguis_count"], 2)
        self.assertEqual({row["tianguis_id"] for row in result["rows"]}, {"t-centro", "t-parque"})

    def test_mass_normalization_and_latest_business_observation(self):
        result = self.call("prices", article_id="jitomate")
        rows = {row["tianguis_id"]: row for row in self.saladette(result)}
        self.assertEqual(rows["t-centro"]["median_price_cents"], 3800)
        self.assertEqual(rows["t-centro"]["min_price_cents"], 3400)
        self.assertEqual(rows["t-centro"]["max_price_cents"], 4200)
        self.assertEqual(rows["t-centro"]["n_samples"], 2)
        self.assertEqual(rows["t-centro"]["n_businesses"], 2)
        self.assertEqual(rows["t-oriente"]["median_price_cents"], 2900)
        self.assertEqual(rows["t-centro"]["spread_market_medians_cents"], 900)
        references = {ref["observation_id"] for row in rows.values() for ref in row["references"]}
        self.assertNotIn("o-oct-old", references)
        self.assertNotIn("o-oct-future", references)
        self.assertNotIn("o-oct-unconfirmed", references)

    def test_volumes_are_normalized_without_mixing_other_units(self):
        rows = self.call("prices", article_id="aceite")["rows"]
        self.assertEqual({row["unit"] for row in rows}, {"l"})
        self.assertEqual({row["median_price_cents"] for row in rows}, {4200, 5600})
        tortillas = self.call("prices", article_id="tortilla")["rows"]
        self.assertEqual({row["unit"] for row in tortillas}, {"pieza", "kg"})
        self.assertTrue(all(row["spread_market_medians_cents"] is None for row in tortillas))

    def test_variants_and_currency_are_separate_groups(self):
        result = self.call("prices", article_id="jitomate")
        self.assertEqual({row["variant"] for row in result["rows"]}, {"saladette", "cherry"})
        self.assertTrue(all(row["n_samples"] == 1 for row in result["rows"] if row["variant"] == "cherry"))
        row = next(row for row in self.snapshot["price_observations"] if row["id"] == "o-oct-oriente1")
        row["currency"] = "USD"
        result = self.call("prices", article_id="jitomate")
        dollars = [row for row in result["rows"] if row["currency"] == "USD"]
        self.assertEqual(len(dollars), 1)
        self.assertIsNone(dollars[0]["spread_market_medians_cents"])

    def test_category_never_produces_a_mixed_product_price_average(self):
        result = self.call("prices", category="verduras")
        self.assertNotIn("average_price_cents", result["metrics"])
        self.assertEqual({row["article_id"] for row in result["rows"]}, {"jitomate", "cebolla"})
        self.assertTrue(all("article_id" in row and "unit" in row for row in result["rows"]))

    def test_invalid_or_unknown_price_is_not_zero(self):
        latest = next(row for row in self.snapshot["price_observations"] if row["id"] == "o-oct-latest")
        self.snapshot["price_observations"] = [latest]
        for price in (None, True, -1, 10.5, "3400"):
            with self.subTest(price=price):
                latest["price_cents"] = price
                self.assertEqual(self.call("prices")["rows"], [])
        latest["price_cents"] = 0
        self.assertEqual(self.call("prices")["rows"][0]["median_price_cents"], 0)

    def test_invalid_quantity_or_page_is_excluded(self):
        latest = next(row for row in self.snapshot["price_observations"] if row["id"] == "o-oct-latest")
        self.snapshot["price_observations"] = [latest]
        for quantity in (0, False, "NaN", "Infinity", "1,5"):
            latest["quantity"] = quantity
            self.assertEqual(self.call("prices")["rows"], [])
        latest["quantity"] = 1
        latest["page"] = 17
        self.assertEqual(self.call("prices")["rows"], [])

    def test_conflicting_latest_prices_are_not_arbitrarily_ranked(self):
        latest = next(row for row in self.snapshot["price_observations"] if row["id"] == "o-oct-latest")
        duplicate = {**latest, "id": "o-conflicting", "price_cents": 9000}
        self.snapshot["price_observations"] = [latest, duplicate]
        result = self.call("prices")
        self.assertEqual(result["rows"], [])
        self.assertTrue(any("ambiguo" in warning for warning in result["warnings"]))

    def test_period_and_day_filters_are_explicit(self):
        september = self.call("prices", period="2026-09", article_id="jitomate")
        rows = {row["tianguis_id"]: row for row in self.saladette(september)}
        self.assertEqual(rows["t-centro"]["median_price_cents"], 2650)
        self.assertEqual(rows["t-oriente"]["median_price_cents"], 2500)
        with self.assertRaises(AdminAnalyticsError):
            self.call("prices", period="2026-09", date="2026-10-25")
        with self.assertRaises(AdminAnalyticsError):
            self.call("prices", period="2026-10", date="2026-10-26")

    def test_attendance_is_distinct_from_report_submission(self):
        attendance = self.call("attendance", date="2026-10-25")
        self.assertEqual(attendance["metrics"]["expected_manager_sessions"], 3)
        self.assertEqual(attendance["metrics"]["present"], 1)
        self.assertEqual(attendance["metrics"]["explicit_absent"], 1)
        self.assertEqual(attendance["metrics"]["unreported"], 1)
        reports = self.call("reports")
        self.assertEqual(reports["metrics"]["submitted"], 1)
        self.assertEqual(reports["metrics"]["overdue"], 1)
        self.assertEqual(reports["metrics"]["pending"], 1)

    def test_missing_attendance_record_stays_unreported(self):
        self.snapshot["attendance"] = []
        result = self.call("attendance")
        self.assertEqual(result["metrics"]["unreported"], 3)
        self.assertEqual(result["metrics"]["explicit_absent"], 0)

    def test_missing_calendar_does_not_invent_expected_sessions(self):
        for market in self.snapshot["tianguis"]:
            del market["scheduled_dates"]
        result = self.call("attendance")
        self.assertEqual(result["metrics"]["expected_manager_sessions"], 0)
        self.assertTrue(any("calendario" in warning for warning in result["warnings"]))

    def test_future_submission_is_not_received(self):
        self.snapshot["monthly_reports"][3]["submitted_at"] = "2026-10-26T10:00:00-06:00"
        self.assertEqual(self.call("reports")["metrics"]["submitted"], 0)

    def test_map_excludes_missing_coordinates_without_inventing_points(self):
        result = self.call("map")
        self.assertEqual(result["metrics"]["located_tianguis"], 2)
        self.assertEqual(result["metrics"]["missing_coordinates"], 1)
        self.assertEqual(len(result["map_points"]), 2)

    def test_composition_has_explicit_denominator_and_named_primary_category(self):
        result = self.call("composition")
        center = [row for row in result["rows"] if row["tianguis_id"] == "t-centro"]
        self.assertAlmostEqual(sum(row["share_percent"] for row in center), 100)
        verduras = next(row for row in center if row["category"] == "verduras")
        self.assertEqual(verduras["business_count"], 2)
        self.assertEqual(verduras["denominator_businesses"], 3)

    def test_all_outputs_are_json_serializable_and_have_provenance(self):
        original = copy.deepcopy(self.snapshot)
        result = dashboard(self.snapshot, {}, self.auth)
        json.dumps(result, allow_nan=False)
        self.assertEqual(original, self.snapshot)
        for action, section in result["sections"].items():
            self.assertEqual(section["action"], action)
            self.assertEqual(section["snapshot_id"], self.snapshot["snapshot_id"])
            self.assertTrue(section["is_demo"])
            self.assertTrue(section["warnings"])
            for chart in section["charts"]:
                self.assertTrue(chart["title"] and chart["x_label"] and chart["y_label"])
        sources = result["sections"]["prices"]["sources"]
        self.assertTrue(any(source.get("page_count") == 16 for source in sources))
        self.assertTrue(all(source["is_demo"] for source in sources))


if __name__ == "__main__":
    unittest.main()
