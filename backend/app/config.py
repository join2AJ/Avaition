from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./aep_portal.db"
    secret_key: str = "change-this-to-a-random-secret-in-production"
    access_token_expire_minutes: int = 480
    algorithm: str = "HS256"
    upload_dir: str = "./uploads"
    admin_email: str = "admin@aepportal.in"
    admin_password: str = "Admin@123456"


settings = Settings()
