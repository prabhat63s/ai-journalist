import os
import sys
import time
from pathlib import Path
from loguru import logger
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

# Load environment variables
load_dotenv()

# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}",
    level="INFO",
)

from app.core.config import settings
from app.api.voice import router as voice_router
from app.api.journalist import router as journalist_router
from app.api.auth import router as auth_router
from app.api.user import router as user_router
from app.core.database import db

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(settings.BANNER)
    logger.info(f"Initializing {settings.APP_NAME}...")
    await db.connect_to_storage()
    logger.info(f"System Online | {settings.ENVIRONMENT.upper()} | Active: [Journalist, Voice-TTS, DB]")
    yield
    await db.close_storage_connection()
    logger.info(f"{settings.APP_NAME} shutting down")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-Id"],
    max_age=600,
)

# ── Simple Rate Limiter ──────────────────────────────────────────────────────
_rate_mem: dict = {}

async def _is_rate_limited(key: str) -> bool:
    now = time.monotonic()
    entry = _rate_mem.get(key)
    if entry is None or (now - entry[1]) >= settings.RATE_LIMIT_WINDOW:
        _rate_mem[key] = (1, now)
        return False
    count, start = entry
    count += 1
    _rate_mem[key] = (count, start)
    return count > settings.RATE_LIMIT_MAX

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.method == "POST" and "/api/journalist/generate-content" in request.url.path:
        user_key = request.query_params.get("email") or request.client.host
        if await _is_rate_limited(user_key):
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded."},
                headers={"Retry-After": str(settings.RATE_LIMIT_WINDOW)},
            )
    return await call_next(request)

@app.middleware("http")
async def latency_logging_middleware(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start_time
    response.headers["X-Response-Time"] = f"{duration:.3f}s"
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Register routers
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(user_router, prefix="/api/user", tags=["user"])
app.include_router(voice_router, prefix="/api/voice")
app.include_router(journalist_router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.APP_NAME}

@app.get("/")
async def root():
    return {"message": settings.APP_NAME, "version": settings.APP_VERSION}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
