import asyncio
import bcrypt
from app.core.config import settings


async def hash_password(password: str) -> str:
    # bcrypt es lento a propósito: se corre en un hilo para no bloquear el servidor
    return (await asyncio.to_thread(
        bcrypt.hashpw, password.encode("utf-8"), bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    )).decode("utf-8")


async def verify_password(password: str, hashed: str) -> bool:
    return await asyncio.to_thread(bcrypt.checkpw, password.encode("utf-8"), hashed.encode("utf-8"))
