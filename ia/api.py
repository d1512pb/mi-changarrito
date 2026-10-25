"""Local read-only bridge for buyer recommendations and administrative data."""

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json

if __package__:
    from .claude_client import ClaudeAPIError
    from .recommender import RecommendationError, recommend
    from .admin.chat import admin_chat
    from .admin.dashboard import admin_dashboard
    from .admin.security import AdminAccessError, AdminConfigurationError, verify_internal_token
else:
    from claude_client import ClaudeAPIError
    from recommender import RecommendationError, recommend
    from admin.chat import admin_chat
    from admin.dashboard import admin_dashboard
    from admin.security import AdminAccessError, AdminConfigurationError, verify_internal_token


def create_server(port=8001, mode="mock"):
    class Handler(BaseHTTPRequestHandler):
        timeout = 10

        def log_message(self, *args):
            pass

        def reply(self, status, value):
            data = json.dumps(value, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if self.path == "/health":
                self.reply(200, {"status": "ok", "mode": mode, "schema_version": "recommendation-1.0", "capabilities": ["recommend", "admin_chat", "admin_dashboard"]})
            else:
                self.reply(404, {"error": {"code": "NOT_FOUND", "message": "Ruta inexistente."}})

        def do_POST(self):
            if self.path not in {"/recommend", "/admin/chat", "/admin/dashboard"}:
                self.reply(404, {"error": {"code": "NOT_FOUND", "message": "Ruta inexistente."}})
                return
            try:
                administrative = self.path.startswith("/admin/")
                length = int(self.headers.get("Content-Length", "0"))
                maximum = 1_000_000 if administrative else 256_000
                if not 0 < length <= maximum:
                    raise RecommendationError("El cuerpo excede el límite permitido de JSON.")
                # Consume the bounded wire body before replying: closing with unread
                # request bytes can reset the connection on Windows and hide a 403.
                # Authentication still precedes JSON parsing or access to its data.
                raw_body = self.rfile.read(length)
                if len(raw_body) != length:
                    raise RecommendationError("El cuerpo JSON está incompleto.")
                if administrative:
                    verify_internal_token(self.headers.get("X-IA-Internal-Token"))
                if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
                    raise RecommendationError("Se requiere Content-Type application/json.")
                payload = json.loads(raw_body.decode("utf-8"))
                if self.path == "/admin/chat":
                    result = admin_chat(payload, mode=mode)
                elif self.path == "/admin/dashboard":
                    result = admin_dashboard(payload)
                else:
                    result = recommend(payload, mode=mode)
                self.reply(200, result)
            except AdminAccessError:
                self.reply(403, {"error": {"code": "FORBIDDEN", "message": "La solicitud no tiene acceso al servicio o a este alcance administrativo."}})
            except AdminConfigurationError as error:
                self.reply(503, {"error": {"code": "ADMIN_NOT_CONFIGURED", "message": str(error)}})
            except ClaudeAPIError:
                self.reply(503, {"error": {"code": "AI_UNAVAILABLE", "message": "El proveedor de IA no está disponible; no se reintentó automáticamente."}})
            except (RecommendationError, ValueError, UnicodeError) as error:
                self.reply(422, {"error": {"code": "VALIDATION_ERROR", "message": str(error)}})
            except Exception:
                self.reply(500, {"error": {"code": "INTERNAL_ERROR", "message": "No fue posible procesar la solicitud."}})

    return ThreadingHTTPServer(("127.0.0.1", port), Handler)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Servicio local IA para backend; no se publica en Internet.")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--mode", choices=["mock", "live"], default="mock")
    args = parser.parse_args()
    server = create_server(args.port, args.mode)
    print(f"IA local en http://127.0.0.1:{args.port}; modo {args.mode}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
