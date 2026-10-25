import uuid
from pathlib import Path
from app.core.errors import Invalid

_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def save_photo(data: bytes, mime: str, uploads_dir: str, max_mb: int) -> str:
    if mime not in _EXT:
        raise Invalid("La foto debe ser JPG, PNG o WEBP")
    if len(data) > max_mb * 1024 * 1024:
        raise Invalid(f"La foto no debe pesar más de {max_mb} MB")
    Path(uploads_dir).mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{_EXT[mime]}"
    (Path(uploads_dir) / name).write_bytes(data)
    return f"/uploads/{name}"
