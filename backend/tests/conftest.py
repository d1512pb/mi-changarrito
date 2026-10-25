import os

# Antes de importar la app: bcrypt rápido y sin límite de sesiones molesto en tests
os.environ.update(BCRYPT_ROUNDS="4", SESSION_SECRET="test-secret", MAX_SESSIONS_PER_USER="5",
                  SEED_ON_START="true", ENVIRONMENT="development", UPLOADS_DIR="/tmp/changarrito-test-uploads")
