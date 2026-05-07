import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt

from app.core.config import settings

_ALGORITHM = "HS256"
_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=_TOKEN_EXPIRE_MINUTES))
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=_ALGORITHM)
