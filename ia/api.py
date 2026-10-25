"""Local read-only bridge for backend: GET /health and POST /recommend."""

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json

if __package__:
    from .claude_client import ClaudeAPIError
    from .recommender import RecommendationError, recommend
else:
    from claude_client import ClaudeAPIError
    from recommender import RecommendationError, recommend


def create_server(port=8001, mode="mock"):
    class Handler(BaseHTTPRequestHandler):
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
                self.reply(200, {"status": "ok", "mode": mode, "schema_version": "recommendation-1.0"})
            else:
                self.reply(404, {"error": {"code": "NOT_FOUND", "message": "Ruta inexistente."}})

        def do_POST(self):
            if self.path != "/recommend":
                self.reply(404, {"error": {"code": "NOT_FOUND", "message": "Ruta inexistente."}})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 256_000:
                    raise RecommendationError("El cuerpo debe contener hasta 256 KB de JSON.")
                if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
                    raise RecommendationError("Se requiere Content-Type application/json.")
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                self.reply(200, recommend(payload, mode=mode))
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
