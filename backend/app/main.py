from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import applications, auth, committees, entities, individuals, users

app = FastAPI(title="AEP Portal API", version="0.1.0")

# CORS: explicit origin allowlist (from CORS_ORIGINS). A credentialed API must
# never pair allow_credentials=True with a "*" wildcard — browsers reject it and
# it signals no origin control. Methods/headers stay scoped to what the SPA uses.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Hardened response headers (defense in depth alongside the frontend host)."""
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Cache-Control", "no-store")
    if settings.is_production:
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=63072000; includeSubDomains"
        )
    return response


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(entities.router)
app.include_router(individuals.router)
app.include_router(applications.router)
app.include_router(committees.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
