import os
from pathlib import Path

# Antes de importar la app: bcrypt rápido y sin límite de sesiones molesto en tests
os.environ.update(BCRYPT_ROUNDS="4", SESSION_SECRET="test-secret", MAX_SESSIONS_PER_USER="5",
                  SEED_ON_START="true", ENVIRONMENT="development",
                  DATABASE_URL="", S3_ENDPOINT="", S3_BUCKET="", S3_ACCESS_KEY_ID="", S3_SECRET_ACCESS_KEY="",
                  UPLOADS_DIR=str(Path(__file__).parent / "uploads"))
