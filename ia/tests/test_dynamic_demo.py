import copy
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dynamic_demo import run_dynamic_demo
from recommender import RecommendationError


class DynamicDemoTests(unittest.TestCase):
    def setUp(self):
        self.payload = json.loads((Path(__file__).resolve().parents[1] / "data" / "tianguis_demo.json").read_text(encoding="utf-8"))

    def test_update_replaces_offer_then_reports_no_match_without_mutating_input(self):
        original = copy.deepcopy(self.payload)
        report = run_dynamic_demo(self.payload)
        self.assertEqual(self.payload, original)
        self.assertEqual([stage["result"]["status"] for stage in report["stages"]], ["ok", "ok", "no_match"])
        second = report["stages"][1]["result"]["recommendations"]
        self.assertEqual([item["offer_id"] for item in second], ["demo-comida-85"])
        self.assertEqual(report["generation_requests"], 0)
        self.assertEqual(report["stages"][2]["result"]["metrics"]["generation_requests"], 0)
        self.assertFalse(report["application_data_modified"])

    def test_real_catalog_cannot_be_used_for_synthetic_updates(self):
        self.payload["offers"][0]["is_demo"] = False
        with self.assertRaises(RecommendationError):
            run_dynamic_demo(self.payload)


if __name__ == "__main__":
    unittest.main()
