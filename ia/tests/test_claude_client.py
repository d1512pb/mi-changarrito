import contextlib
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from claude_client import ClaudeAPIError, ClaudeClient, Credentials, SMOKE_MODEL, load_credentials
from smoke_test import main


class ClaudeConnectionTests(unittest.TestCase):
    def make_client(self, payload):
        opener = MagicMock()
        response = opener.open.return_value.__enter__.return_value
        response.read.return_value = json.dumps(payload).encode()
        return ClaudeClient(Credentials("test-only-key"), opener=opener), opener

    def test_missing_key_fails_before_network(self):
        with patch.object(Path, "is_file", return_value=False):
            with self.assertRaises(ClaudeAPIError):
                load_credentials(Path("virtual.env"), environ={})

    def test_local_configuration_and_process_override(self):
        content = 'ANTHROPIC_API_KEY="local-test-key"\nANTHROPIC_WORKSPACE_ID=workspace-test\n'
        with patch.object(Path, "is_file", return_value=True):
            with patch.object(Path, "read_text", return_value=content):
                credentials = load_credentials(Path("virtual.env"), environ={"ANTHROPIC_API_KEY": "process-test-key"})
        self.assertEqual(credentials.api_key, "process-test-key")
        self.assertEqual(credentials.workspace_id, "workspace-test")
        self.assertNotIn("process-test-key", repr(credentials))

    def test_smoke_is_one_bounded_request_to_official_endpoint(self):
        client, opener = self.make_client({"content": [{"type": "text", "text": "OK"}]})
        client.smoke_message()
        opener.open.assert_called_once()
        request = opener.open.call_args.args[0]
        payload = json.loads(request.data)
        self.assertEqual(request.full_url, "https://api.anthropic.com/v1/messages")
        self.assertEqual(payload["model"], SMOKE_MODEL)
        self.assertEqual(payload["max_tokens"], 32)
        self.assertEqual(payload["thinking"], {"type": "disabled"})
        self.assertEqual(payload["output_config"], {"effort": "low"})
        self.assertNotIn("tools", payload)
        self.assertNotIn("test-only-key", request.data.decode())

    def test_http_failure_is_not_retried_or_exposed(self):
        client, opener = self.make_client({})
        opener.open.side_effect = HTTPError("https://api.anthropic.com", 401, "private provider response", {}, io.BytesIO(b"test-only-key"))
        with self.assertRaises(ClaudeAPIError) as result:
            client.smoke_message()
        opener.open.assert_called_once()
        self.assertNotIn("test-only-key", str(result.exception))
        self.assertNotIn("private provider response", str(result.exception))

    def test_network_failure_is_not_retried(self):
        client, opener = self.make_client({})
        opener.open.side_effect = URLError("offline")
        with self.assertRaises(ClaudeAPIError):
            client.smoke_message()
        opener.open.assert_called_once()

    def test_provider_diagnostics_redact_credentials(self):
        client, opener = self.make_client({})
        body = json.dumps({"error": {"message": "Rejected test-only-key and sk-ant-example-not-real"}}).encode()
        opener.open.side_effect = HTTPError("https://api.anthropic.com", 400, "bad request", {}, io.BytesIO(body))
        with self.assertRaises(ClaudeAPIError) as result:
            client.model_info()
        self.assertNotIn("test-only-key", str(result.exception))
        self.assertNotIn("sk-ant-example-not-real", str(result.exception))

    def test_dry_run_needs_no_key_or_network(self):
        with patch("smoke_test.ClaudeClient") as client:
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(main(["--dry-run"]), 0)
            client.assert_not_called()

    def test_live_flow_reports_usage_without_printing_provider_text(self):
        response = {"model": SMOKE_MODEL, "content": [{"type": "text", "text": "OK"}], "usage": {"input_tokens": 20, "output_tokens": 2}, "stop_reason": "end_turn"}
        with patch("smoke_test.load_credentials", return_value=Credentials("test-only-key")):
            with patch("smoke_test.ClaudeClient") as constructor:
                client = constructor.return_value
                client.model_info.return_value = {"id": SMOKE_MODEL}
                client.smoke_message.return_value = response
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    self.assertEqual(main([]), 0)
                result = json.loads(output.getvalue())
                self.assertTrue(result["expected_ok_received"])
                self.assertEqual(result["generation_requests"], 1)
                self.assertAlmostEqual(result["estimated_token_cost_usd"], 0.000003)
                self.assertNotIn("test-only-key", output.getvalue())


if __name__ == "__main__":
    unittest.main()
