from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import applications, auth, committees, entities, individuals, users

app = FastAPI(title="AEP Portal API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(entities.router)
app.include_router(individuals.router)
app.include_router(applications.router)
app.include_router(committees.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
