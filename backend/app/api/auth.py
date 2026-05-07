import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from jose import JWTError, jwt
from app.core.database import db
from app.core.config import settings
from app.models.schemas import UserCreate, UserLogin, UserResponse, Token, EmailCheckResponse
from bson import ObjectId
from loguru import logger

router = APIRouter()

# Security configuration
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def verify_password(plain_password: str, hashed_password: str):
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

def get_password_hash(password: str):
    return bcrypt.hashpw(
        password.encode('utf-8'), 
        bcrypt.gensalt()
    ).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/check-email", response_model=EmailCheckResponse)
async def check_email(data: dict):
    email = data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    user = await db.db.users.find_one({"email": email.lower()})
    if user:
        return {"exists": True, "name": user.get("name")}
    return {"exists": False, "name": None}

@router.post("/register", response_model=Token)
async def register(user_in: UserCreate):
    # Check if user already exists
    existing_user = await db.db.users.find_one({"email": user_in.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    
    user_dict = {
        "email": user_in.email.lower(),
        "hashed_password": get_password_hash(user_in.password),
        "name": user_in.name,
        "created_at": datetime.utcnow()
    }
    
    result = await db.db.users.insert_one(user_dict)
    
    access_token = create_access_token(
        data={"sub": user_in.email, "id": str(result.inserted_id)}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin):
    user = await db.db.users.find_one({"email": user_in.email.lower()})
    if not user or not verify_password(user_in.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user["email"], "id": str(user["_id"])}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = await db.db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name"),
        "created_at": user["created_at"]
    }
