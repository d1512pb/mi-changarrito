from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class SessionInfoMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # detrás de un proxy (Render, Cloud Run, etc.) la IP real viene en X-Forwarded-For
        forwarded = request.headers.get("x-forwarded-for", "")
        request.state.client_ip = forwarded.split(",")[0].strip() or (request.client.host if request.client else "")
        request.state.user_agent = request.headers.get("user-agent", "")
        return await call_next(request)