# AEP Portal API — FastAPI on Uvicorn.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# psycopg2-binary bundles libpq, so no system build deps are needed.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN chmod +x entrypoint.sh \
    && adduser --disabled-password --gecos "" appuser \
    && mkdir -p /data/uploads && chown -R appuser /app /data
USER appuser

EXPOSE 8000
# FastAPI always serves /openapi.json — cheap liveness probe, no curl needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/openapi.json').status==200 else 1)"

ENTRYPOINT ["./entrypoint.sh"]
