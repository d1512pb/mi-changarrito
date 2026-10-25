import re
import uuid
from functools import lru_cache
from pathlib import Path

from app.core.config import settings
from app.core.errors import Invalid

_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
_PHOTO_NAME = re.compile(r"[0-9a-f]{32}\.(?:jpg|png|webp)\Z")


@lru_cache(maxsize=1)
def _s3_client():
    import boto3
    from botocore.config import Config
    return boto3.client(
        "s3", endpoint_url=settings.S3_ENDPOINT, region_name=settings.S3_REGION,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        config=Config(
            signature_version="s3v4", connect_timeout=10, read_timeout=30,
            retries={"max_attempts": 2},
            s3={"addressing_style": "path" if settings.S3_FORCE_PATH_STYLE else "virtual"},
        ),
    )


def valid_photo_name(name: str) -> bool:
    return _PHOTO_NAME.fullmatch(name) is not None


def photo_object_key(name: str) -> str:
    if not valid_photo_name(name):
        raise Invalid("La imagen no es válida")
    return f"offers/{name}"


def signed_photo_url(name: str) -> str:
    return _s3_client().generate_presigned_url(
        "get_object", Params={"Bucket": settings.S3_BUCKET, "Key": photo_object_key(name)},
        ExpiresIn=settings.S3_URL_TTL_SECONDS,
    )


def save_photo(data: bytes, mime: str, uploads_dir: str, max_mb: int) -> str:
    if mime not in _EXT:
        raise Invalid("La foto debe ser JPG, PNG o WEBP")
    if not data:
        raise Invalid("La foto está vacía")
    if len(data) > max_mb * 1024 * 1024:
        raise Invalid(f"La foto no debe pesar más de {max_mb} MB")
    name = f"{uuid.uuid4().hex}{_EXT[mime]}"
    if settings.s3_enabled:
        _s3_client().put_object(
            Bucket=settings.S3_BUCKET, Key=photo_object_key(name), Body=data,
            ContentType=mime, CacheControl="private, max-age=300",
        )
    else:
        if settings.ENVIRONMENT.lower() == "production":
            raise RuntimeError("El almacenamiento S3 es obligatorio en production")
        Path(uploads_dir).mkdir(parents=True, exist_ok=True)
        (Path(uploads_dir) / name).write_bytes(data)
    # Persist a stable application URL, never an expiring signed URL.
    return f"/uploads/{name}"
