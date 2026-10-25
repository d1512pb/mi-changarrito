FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app/backend
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
    && groupadd --gid 10001 changarrito \
    && useradd --uid 10001 --gid changarrito --create-home changarrito

COPY --chown=10001:10001 backend/ /app/backend/
COPY --chown=10001:10001 ia/ /app/ia/
COPY --chown=10001:10001 fronted/ /app/fronted/
RUN mkdir -p /app/backend/uploads && chown -R 10001:10001 /app/backend/uploads

USER 10001:10001
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]
