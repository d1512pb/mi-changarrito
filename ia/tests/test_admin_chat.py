import copy
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from admin.chat import AdminChatError, admin_chat, scoped_metadata
from admin.dashboard import admin_dashboard
from admin.security import AdminAccessError, AdminConfigurationError, verify_internal_token
from admin_demo import demo_authorization


class Planner:
    def __init__(self, plan):
        self.plan = plan
        self.metadata = None
        self.called = False

    def plan_admin_query(self, query, metadata, previous):
        self.called = True
        self.metadata = copy.deepcopy(metadata)
        return {"model": "claude-haiku-5-5", "stop_reason": "end_turn", "content": [{"type": "text", "text": json.dumps(self.plan)}], "usage": {"input_tokens": 20, "output_tokens": 10}}


class AdminChatTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = json.loads((Path(__file__).resolve().parents[1] / "data" / "admin_snapshot_demo.json").read_text(encoding="utf-8"))
        self.authorization = demo_authorization(self.snapshot)
        self.payload = {"query": "Compara precios de jitomate en octubre", "snapshot": self.snapshot, "authorization": self.authorization}

    def plan(self, **updates):
        value = {"action": "prices", "period": "2026-10", "borough": None, "tianguis_ids": [], "category": None, "article_id": None, "date": None, "clarification": None}
        value.update(updates)
        return value

    def test_chat_computes_prices_and_includes_visuals_and_sources(self):
        result = admin_chat(self.payload)
        self.assertEqual(result["data"]["action"], "prices")
        self.assertTrue(result["data"]["rows"])
        self.assertTrue(result["data"]["charts"])
        self.assertTrue(result["data"]["sources"])
        self.assertTrue(result["read_only"])
        self.assertEqual(result["metrics"]["generation_requests"], 0)

    def test_followup_keeps_action_and_changes_month(self):
        first = admin_chat(self.payload)
        self.payload.update(query="Y ahora en septiembre", conversation_state=first["conversation_state"])
        second = admin_chat(self.payload)
        self.assertEqual(second["data"]["action"], "prices")
        self.assertEqual(second["conversation_state"]["filters"]["period"], "2026-09")

    def test_role_is_checked_before_model_or_statistics(self):
        self.authorization["role"] = "buyer"
        planner = Planner(self.plan())
        with self.assertRaises(AdminAccessError):
            admin_chat(self.payload, mode="live", client=planner)
        self.assertFalse(planner.called)

    def test_model_metadata_contains_only_allowed_markets_and_no_manager_names_or_prices(self):
        self.authorization["allowed_tianguis_ids"] = ["t-centro"]
        planner = Planner(self.plan())
        admin_chat(self.payload, mode="live", client=planner)
        self.assertEqual([market["id"] for market in planner.metadata["tianguis"]], ["t-centro"])
        text = json.dumps(planner.metadata)
        for manager in self.snapshot["managers"]:
            self.assertNotIn(manager["name"], text)
        self.assertNotIn("price_cents", text)

    def test_model_cannot_expand_scope(self):
        self.authorization["allowed_tianguis_ids"] = ["t-centro"]
        with self.assertRaises(AdminAccessError):
            admin_chat(self.payload, mode="live", client=Planner(self.plan(tianguis_ids=["t-oriente"])))

    def test_context_cannot_expand_scope_before_model(self):
        self.authorization["allowed_tianguis_ids"] = ["t-centro"]
        self.payload["conversation_state"] = {"filters": {"tianguis_ids": ["t-oriente"]}, "last_action": "prices"}
        planner = Planner(self.plan())
        with self.assertRaises(AdminAccessError):
            admin_chat(self.payload, mode="live", client=planner)
        self.assertFalse(planner.called)

    def test_missing_permission_and_unknown_model_action_are_rejected(self):
        self.authorization["permissions"] = ["analytics:read"]
        with self.assertRaises(AdminAccessError):
            admin_chat(self.payload, mode="live", client=Planner(self.plan()))
        with self.assertRaises(AdminChatError):
            admin_chat(self.payload, mode="live", client=Planner(self.plan(action=[])))

    def test_mutation_and_payment_queries_are_read_only_clarifications(self):
        for query in ("Borra el tianguis", "Implementa pagos con CoDi"):
            with self.subTest(query=query):
                self.payload["query"] = query
                result = admin_chat(self.payload)
                self.assertEqual(result["status"], "needs_clarification")
                self.assertIsNone(result["data"])

    def test_dashboard_is_filtered_to_scope(self):
        self.authorization["allowed_tianguis_ids"] = ["t-centro"]
        result = admin_dashboard(self.payload)
        self.assertTrue(result["read_only"])
        self.assertEqual(result["data"]["sections"]["overview"]["metrics"]["tianguis_count"], 1)
        self.assertNotIn("map", result["data"]["sections"])
        self.assertEqual(result["data"]["deferred_features"][0]["audiences"], ["buyer", "admin"])

    def test_source_labels_do_not_leak_manager_names_without_permission(self):
        self.authorization["permissions"] = ["analytics:read"]
        self.payload["query"] = "Resumen general"
        secret_name = "Gerente Privado De Prueba"
        for source in self.snapshot["sources"]:
            source.update(label=secret_name, note=secret_name)
        result = admin_chat(self.payload)
        self.assertNotIn(secret_name, json.dumps(result))

    def test_internal_service_token_is_required(self):
        with patch.dict(os.environ, {"IA_INTERNAL_TOKEN": "dummy-internal-service-token-for-tests"}):
            with self.assertRaises(AdminAccessError):
                verify_internal_token(None)
            with self.assertRaises(AdminAccessError):
                verify_internal_token("wrong")
            with self.assertRaises(AdminAccessError):
                verify_internal_token("inválido")
            verify_internal_token("dummy-internal-service-token-for-tests")

    def test_missing_internal_token_is_not_treated_as_authenticated(self):
        with patch.dict(os.environ, {"IA_INTERNAL_TOKEN": ""}):
            with patch.object(Path, "is_file", return_value=False):
                with self.assertRaises(AdminConfigurationError):
                    verify_internal_token(None)


if __name__ == "__main__":
    unittest.main()
