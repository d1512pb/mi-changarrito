import asyncio
import bcrypt
from app.core.config import settings
from app.core.errors import Invalid


async def hash_password(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise Invalid("La contraseña no debe exceder 72 bytes en UTF-8")
    # bcrypt es lento a propósito: se corre en un hilo para no bloquear el servidor
    return (await asyncio.to_thread(
        bcrypt.hashpw, password.encode("utf-8"), bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    )).decode("utf-8")


async def verify_password(password: str, hashed: str) -> bool:
    if len(password.encode("utf-8")) > 72:
        return False
    return await asyncio.to_thread(bcrypt.checkpw, password.encode("utf-8"), hashed.encode("utf-8"))
