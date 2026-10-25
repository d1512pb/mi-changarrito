import hmac
import secrets
from datetime import datetime, timedelta, timezone
from hashlib import sha3_256
from typing import Optional

from app.core.config import settings


def _now() -> datetime:
    return datetime.now(timezone.utc)


class SessionService:
    """Sesiones opacas: el cliente guarda un token y lo manda en `Authorization: Bearer`.
    En la base solo se guarda el HMAC del token, nunca el token."""

    def __init__(self, db):
        self.db = db
        self.max_sessions_per_user = settings.MAX_SESSIONS_PER_USER

    def shash_session_id(self, token: str) -> str:
        return hmac.new(settings.SESSION_SECRET.encode(), token.encode(), sha3_256).hexdigest()

    async def create_session(self, user_id: str, ip_address: str, user_agent: str) -> str:
        await self.session_limit(user_id)
        token = secrets.token_urlsafe(32)
        t = _now()
        await self.db.sessions.insert({
            "session_hash": self.shash_session_id(token),
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": t,
            "last_activity": t,
            "expires_at": t + timedelta(days=settings.SESSION_TTL_DAYS),
            "is_active": True,
        })
        return token

    async def validate_session(self, token: str) -> Optional[dict]:
        session = await self.db.sessions.find_one(session_hash=self.shash_session_id(token), is_active=True)
        if not session or session["expires_at"] <= _now():
            return None
        await self.db.sessions.update(session["id"], {"last_activity": _now()})
        return session

    async def invalidate_session(self, token: str) -> bool:
        session = await self.db.sessions.find_one(session_hash=self.shash_session_id(token), is_active=True)
        if not session:
            return False
        await self.db.sessions.update(session["id"], {"is_active": False})
        return True

    async def invalidate_all_sessions(self, user_id: str) -> int:
        sessions = await self.db.sessions.find(user_id=user_id, is_active=True)
        for s in sessions:
            await self.db.sessions.update(s["id"], {"is_active": False})
        return len(sessions)

    async def get_active_sessions(self, user_id: str) -> list:
        t = _now()
        sessions = await self.db.sessions.find(where=lambda d: d["expires_at"] > t, user_id=user_id, is_active=True)
        return sorted(sessions, key=lambda s: s["last_activity"], reverse=True)

    async def session_limit(self, user_id: str) -> None:
        active = await self.get_active_sessions(user_id)
        if len(active) >= self.max_sessions_per_user:
            # cierra las más viejas para dejar espacio a la nueva
            for old in active[self.max_sessions_per_user - 1:]:
                await self.db.sessions.update(old["id"], {"is_active": False})
