from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Job Application Assistant"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/jobassist"

    # Auth (JWT)
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 

    # API Keys
    GROQ_API_KEY: str = ""
    JOOBLE_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ADZUNA_APP_ID: str = ""
    ADZUNA_APP_KEY: str = ""

    # Email / SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True
    EMAILS_FROM_EMAIL: str = ""

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "https://yourdomain.com"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        # This tells Pydantic to ignore extra fields in .env instead of crashing
        extra = "ignore" 


settings = Settings()

_INSECURE_DEFAULT_KEY = "change-me-in-production"
if settings.SECRET_KEY == _INSECURE_DEFAULT_KEY:
    import warnings
    warnings.warn(
        "SECRET_KEY is set to the insecure default value. "
        "Set a strong random SECRET_KEY in your environment before going to production.",
        stacklevel=1,
    )