from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.core.config import settings
from app.core.database import db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.schemas import EmailCheckResponse, Token, UserCreate, UserLogin, UserResponse

router = APIRouter()

_bearer = HTTPBearer()
_ALGORITHM = "HS256"


@router.post("/check-email", response_model=EmailCheckResponse)
async def check_email(data: dict):
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    user = await db.db.users.find_one({"email": email.lower()})
    if user:
        return {"exists": True, "name": user.get("name")}
    return {"exists": False, "name": None}


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate):
    existing = await db.db.users.find_one({"email": user_in.email.lower()})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user_doc = {
        "email": user_in.email.lower(),
        "hashed_password": hash_password(user_in.password),
        "name": user_in.name,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.db.users.insert_one(user_doc)
    token = create_access_token({"sub": user_in.email, "id": str(result.inserted_id)})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
async def login(user_in: UserLogin):
    user = await db.db.users.find_one({"email": user_in.email.lower()})
    if not user or not verify_password(user_in.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    token = create_access_token({"sub": user["email"], "id": str(user["_id"])})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(credentials: HTTPAuthorizationCredentials = Depends(_bearer)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[_ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.db.users.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name"),
        "created_at": user["created_at"],
    }
