from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Sentinel defaults that MUST be overridden before a production deployment.
_DEFAULT_SECRET = "change-this-to-a-random-secret-in-production"
_DEFAULT_ADMIN_PASSWORD = "Admin@123456"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # "development" keeps the convenient defaults; "production" makes the
    # validator below fail-fast on any insecure default, so a hardened deploy
    # can never silently run with a forgeable JWT secret or a known admin pw.
    environment: str = "development"

    database_url: str = "sqlite:///./aep_portal.db"
    secret_key: str = _DEFAULT_SECRET
    access_token_expire_minutes: int = 480
    algorithm: str = "HS256"
    upload_dir: str = "./uploads"
    admin_email: str = "admin@aepportal.in"
    admin_password: str = _DEFAULT_ADMIN_PASSWORD

    # Comma-separated browser origins allowed to call the API. The default
    # covers local Vite dev/preview ports only; production must set
    # CORS_ORIGINS to the real frontend origin(s).
    cors_origins: str = "http://localhost:5173,http://localhost:4173,http://localhost:4174"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() in ("production", "prod")

    @model_validator(mode="after")
    def _enforce_production_hardening(self) -> "Settings":
        if not self.is_production:
            return self
        problems: list[str] = []
        if self.secret_key == _DEFAULT_SECRET:
            problems.append(
                'SECRET_KEY is still the built-in default — set a random value '
                '(python -c "import secrets; print(secrets.token_urlsafe(48))").'
            )
        elif len(self.secret_key) < 32:
            problems.append("SECRET_KEY is too short — use at least 32 characters of entropy.")
        if self.admin_password == _DEFAULT_ADMIN_PASSWORD:
            problems.append("ADMIN_PASSWORD is still the built-in default — set a strong unique value.")
        if "*" in self.cors_origins:
            problems.append("CORS_ORIGINS must be an explicit allowlist in production, not a wildcard.")
        if problems:
            raise RuntimeError(
                "Refusing to start in production with insecure configuration:\n  - "
                + "\n  - ".join(problems)
            )
        return self


settings = Settings()
