#!/usr/bin/env sh
# Wait for Postgres, apply migrations (falling back to seed's create_all on a
# fresh DB), optionally seed demo data, then start the API.
set -e

echo "[entrypoint] waiting for the database…"
python - <<'PY'
import os, time
from sqlalchemy import create_engine, text
url = os.environ["DATABASE_URL"]
for attempt in range(30):
    try:
        create_engine(url).connect().execute(text("SELECT 1"))
        print("[entrypoint] database is up"); break
    except Exception as exc:
        print(f"[entrypoint] db not ready ({attempt+1}/30): {exc}"); time.sleep(2)
else:
    raise SystemExit("[entrypoint] database never became reachable")
PY

echo "[entrypoint] applying migrations (alembic upgrade head)…"
alembic upgrade head || echo "[entrypoint] alembic step skipped (seed will create tables)"

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] seeding schema + demo data…"
  python seed.py || echo "[entrypoint] seed skipped (already populated)"
fi

echo "[entrypoint] starting Uvicorn…"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${WEB_CONCURRENCY:-2}"
