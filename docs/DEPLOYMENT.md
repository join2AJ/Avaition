# AEP Portal — Deployment Guide

One container image set, three deployment targets: **on-prem**, **cloud (off-prem)**, and **hybrid**. The same `docker-compose.yml` runs everywhere; production simply swaps the bundled `db` / `redis` / `minio` for managed or hardened equivalents.

```
web (Nginx + SPA :8080) ──/api──► backend (FastAPI :8000) ──► db     (PostgreSQL)
                                            │
                                            ├─► redis  (sessions · login throttle · notification fan-out)
                                            └─► minio  (S3-compatible store for attachments)
```

---

## 1. Quick start (local / single node)

```bash
cp .env.example .env          # then edit secrets
docker compose up --build     # first run seeds schema + demo data (SEED_ON_START=true)
```

| URL | What |
|-----|------|
| http://localhost:8080 | The portal (SPA) |
| http://localhost:8080/api/docs | FastAPI Swagger UI (proxied) |
| http://localhost:9001 | MinIO console (object store) |

Default login seeds an admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. After the first boot, set `SEED_ON_START=false` in `.env` so it doesn't re-seed.

Common commands:

```bash
docker compose logs -f backend        # tail API logs
docker compose exec backend python seed.py   # (re)seed manually
docker compose exec db psql -U aep aep_portal # psql shell
docker compose down                   # stop (keeps volumes/data)
docker compose down -v                # stop AND delete all data
```

---

## 2. Services & ports

| Service | Image | Port | Volume | Role |
|---------|-------|------|--------|------|
| `web` | Nginx + built SPA | 8080→80 | – | Serves the app, proxies `/api`, adds security headers |
| `backend` | FastAPI (this repo) | 8000 (internal) | `uploads` | REST API, JWT auth, RBAC, audit |
| `db` | postgres:16 | 5432 (internal) | `pgdata` | System of record (the 42-table schema) |
| `redis` | redis:7 | 6379 (internal) | `redisdata` | Sessions, durable login throttle, notification pub/sub |
| `minio` | MinIO | 9000/9001 | `miniodata` | Attachments (photos, BGC reports, contract copies) |

Only `web` (and MinIO's console, for admins) is exposed to the host; the API and datastores stay on the internal Docker network.

---

## 3. Production hardening (do before any real deploy)

1. **Set `ENVIRONMENT=production`.** The API then *refuses to start* if any insecure default remains (this is enforced in `backend/app/config.py`).
2. **Generate a real `SECRET_KEY`:** `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
3. **Set a strong `ADMIN_PASSWORD`** and rotate the seeded admin.
4. **`CORS_ORIGINS`** = your real frontend origin(s), comma-separated. No `*`.
5. **TLS** — terminate HTTPS at the edge (the `web` Nginx, a load balancer, or an ingress). Add HSTS (already in `netlify.toml` for reference).
6. **Secrets** — inject via your orchestrator's secret store (Docker/K8s secrets, Vault, cloud secret manager), not a committed `.env`.
7. **Backups** — schedule `pg_dump` (or managed PITR) for `db`, and versioning/replication for the MinIO bucket.
8. **Migrations** — run `alembic upgrade head` on deploy (the entrypoint does this automatically); turn `SEED_ON_START=false`.

---

## 4. Deployment models

### 4a. On-prem (airport data centre / air-gapped)
Best when Security-Restricted-Area data or regulator mandate requires full local control.

- Run this compose on a hardened host, or promote to **Kubernetes** for HA.
- **Postgres HA:** Patroni + streaming replicas + PITR (pgBackRest).
- **Object store:** keep **MinIO** (already S3-compatible) — no code change.
- **Identity/2FA:** add **Keycloak** for SSO + MFA the login page promises.
- **Updates:** pull images into a local registry (Harbor) for air-gapped upgrades.
- Trade-off: maximum control & residency; you own the ops burden.

### 4b. Off-prem (cloud)
Best for fastest scale and managed ops, when data-residency review passes.

- Use **India regions** (e.g. Mumbai/Hyderabad) for MeitY data-residency.
- Swap the bundled services for managed ones (env-var change only):
  - `db` → **RDS / Cloud SQL / Azure Database for PostgreSQL**
  - `redis` → **ElastiCache / Memorystore / Azure Cache**
  - `minio` → **S3 / GCS / Azure Blob** (S3 API stays the same)
- Run `web` + `backend` on **ECS/Fargate, GKE, or AKS**; front with a managed **load balancer + WAF + CDN**.
- Trade-off: least ops, elastic scale; needs a compliance sign-off for regulated data.

### 4c. Hybrid (recommended for BCAS-style systems)
Keep the sensitive **system of record on-prem**, push read-heavy/portal workloads to the cloud.

- **On-prem:** identity, `bgc_checks`, `passes`, `access_events`, attachments (MinIO) — the regulated core.
- **Cloud:** the portal `web`/`backend`, reporting, and notification fan-out — the elastic edge.
- **Link:** site-to-site VPN or PrivateLink; replicate read-only data to the cloud via CDC (Debezium) or logical replication.
- Trade-off: residency + control for sensitive data, cloud scale for everything else — no rewrite, just where each service runs.

---

## 5. Scaling levers

| Need | Lever |
|------|-------|
| More API throughput | Raise `WEB_CONCURRENCY`; run multiple `backend` replicas behind the LB (stateless — sessions live in Redis) |
| More read capacity | Postgres read replicas; move heavy reports off the primary |
| File growth | MinIO distributed mode / managed object storage; lifecycle rules |
| **Release-to-all at scale** | Write **one** broadcast row, then fan out via Redis pub/sub → a notifications worker → WebSocket/SSE + email/SMS/push. Per-user read state lives in `notification_reads`; never loop-insert per user. |
| Background jobs (expiry, SLA) | Current `APScheduler` → promote to a dedicated worker (Celery/RQ) with Redis as broker |
| Observability | Prometheus + Grafana (metrics), Sentry (errors), structured logs shipped to Loki/ELK |

---

## 6. What this bundle deliberately leaves as "next"

- **Keycloak** (SSO/MFA) is described but not wired — add as a service when you move off demo auth.
- **A notifications worker + WebSocket gateway** for realtime delivery (the schema and broadcast API already support it).
- **CI/CD & IaC** — build/push images in GitHub Actions; provision infra with Terraform.

The point of this compose is a single artifact that runs the whole stack identically on a laptop, an on-prem server, or a cloud cluster — so the on-prem / cloud / hybrid choice stays open without a code change.
