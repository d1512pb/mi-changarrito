"""Local HTTP contract checks; synthetic identity, mock mode, no provider calls."""

from http.client import HTTPConnection
import json
import os
from pathlib import Path
import sys
import threading
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ia.api import create_server


class AdminHTTPTests(unittest.TestCase):
    INTERNAL_TOKEN = "test-only-internal-service-token-0001"

    def setUp(self):
        fixture = Path(__file__).resolve().parents[1] / "data" / "admin_snapshot_demo.json"
        self.snapshot = json.loads(fixture.read_text(encoding="utf-8"))
        self.authorization = {
            "role": "admin",
            "actor_id": "http-test-admin",
            "allowed_tianguis_ids": ["t-centro"],
            "permissions": [
                "analytics:read", "prices:read", "attendance:read",
                "reports:read", "managers:read",
            ],
        }

        environment = patch.dict(os.environ, {"IA_INTERNAL_TOKEN": self.INTERNAL_TOKEN})
        environment.start()
        self.addCleanup(environment.stop)

        client = patch("ia.admin.chat.ClaudeClient", side_effect=AssertionError("Mock HTTP must not call Claude"))
        self.client_mock = client.start()
        self.addCleanup(client.stop)
        credentials = patch("ia.admin.chat.load_credentials", side_effect=AssertionError("Mock HTTP must not load credentials"))
        self.credentials_mock = credentials.start()
        self.addCleanup(credentials.stop)

        self.server = create_server(0, "mock")
        # server_close waits for request workers as well as the serve_forever thread.
        self.server.daemon_threads = False
        self.thread = threading.Thread(
            target=self.server.serve_forever,
            kwargs={"poll_interval": 0.01},
            name="admin-http-test-server",
            daemon=True,
        )
        self.thread.start()
        self.addCleanup(self.stop_server)

    def tearDown(self):
        self.client_mock.assert_not_called()
        self.credentials_mock.assert_not_called()

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=3)
        self.assertFalse(self.thread.is_alive(), "The local HTTP server thread did not stop")

    def post(self, route, *, include_token=True, role="admin"):
        payload = {
            "query": "Resumen general",
            "snapshot": self.snapshot,
            "authorization": {**self.authorization, "role": role},
        }
        headers = {"Content-Type": "application/json"}
        if include_token:
            headers["X-IA-Internal-Token"] = self.INTERNAL_TOKEN
        connection = HTTPConnection("127.0.0.1", self.server.server_address[1], timeout=3)
        try:
            connection.request("POST", route, json.dumps(payload).encode("utf-8"), headers)
            response = connection.getresponse()
            return response.status, json.loads(response.read().decode("utf-8"))
        finally:
            connection.close()

    def test_admin_routes_require_token_even_with_valid_admin_json(self):
        for route in ("/admin/chat", "/admin/dashboard"):
            with self.subTest(route=route):
                status, result = self.post(route, include_token=False)
                self.assertEqual(status, 403)
                self.assertEqual(result["error"]["code"], "FORBIDDEN")

    def test_valid_service_token_does_not_authorize_buyer_as_admin(self):
        for route in ("/admin/chat", "/admin/dashboard"):
            with self.subTest(route=route):
                status, result = self.post(route, role="buyer")
                self.assertEqual(status, 403)
                self.assertEqual(result["error"]["code"], "FORBIDDEN")

    def test_authorized_chat_is_scoped_and_does_not_call_claude(self):
        status, result = self.post("/admin/chat")
        self.assertEqual(status, 200)
        self.assertTrue(result["read_only"])
        self.assertEqual(result["mode"], "mock")
        self.assertEqual(result["metrics"]["generation_requests"], 0)
        self.assertEqual(result["data"]["metrics"]["tianguis_count"], 1)
        self.assertEqual({row["tianguis_id"] for row in result["data"]["rows"]}, {"t-centro"})

    def test_authorized_dashboard_is_scoped_and_omits_default_map(self):
        status, result = self.post("/admin/dashboard")
        self.assertEqual(status, 200)
        self.assertTrue(result["read_only"])
        sections = result["data"]["sections"]
        self.assertNotIn("map", sections)
        self.assertEqual(sections["overview"]["metrics"]["tianguis_count"], 1)
        self.assertEqual({row["tianguis_id"] for row in sections["overview"]["rows"]}, {"t-centro"})
        for name, section in sections.items():
            with self.subTest(section=name):
                self.assertTrue(all(row["tianguis_id"] == "t-centro" for row in section["rows"]))


if __name__ == "__main__":
    unittest.main()
