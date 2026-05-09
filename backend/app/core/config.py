import os
import sys
from pydantic_settings import BaseSettings

_DEFAULT_JWT = "your-super-secret-key-change-me-in-production"

class Settings(BaseSettings):
    APP_NAME: str = "Slate API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")

    RATE_LIMIT_MAX: int = 60
    RATE_LIMIT_WINDOW: int = 60

    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", _DEFAULT_JWT)

    BANNER: str = """
 ██████╗ ██╗      █████╗ ████████╗███████╗
██╔════╝ ██║     ██╔══██╗╚══██╔══╝██╔════╝
╚█████╗  ██║     ███████║   ██║   █████╗  
 ╚═══██╗ ██║     ██╔══██║   ██║   ██╔══╝  
██████╔╝ ███████╗██║  ██║   ██║   ███████╗
╚═════╝  ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝
                                     Slate Backend
    """

    def validate_critical(self) -> None:
        errors = []
        if not self.DATABASE_URL:
            errors.append("DATABASE_URL is not set")
        if self.JWT_SECRET_KEY == _DEFAULT_JWT:
            errors.append("JWT_SECRET_KEY is still the insecure default — set a strong secret")
        if errors:
            for e in errors:
                print(f"[STARTUP ERROR] {e}", file=sys.stderr)
            sys.exit(1)

settings = Settings()
