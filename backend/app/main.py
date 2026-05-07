import sys
import time

from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

load_dotenv()

logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}",
    level="INFO",
)

from app.core.config import settings
from app.core.database import db
from app.routers import auth_router, users_router, articles_router, voice_router

settings.validate_critical()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(settings.BANNER)
    logger.info(f"Starting {settings.APP_NAME} [{settings.ENVIRONMENT.upper()}]")
    await db.connect_to_storage()
    logger.info("Database connected")
    yield
    await db.close_storage_connection()
    logger.info(f"{settings.APP_NAME} stopped")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

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

_rate_store: dict = {}
_RATE_STORE_MAX = 10_000


async def _is_rate_limited(key: str) -> bool:
    now = time.monotonic()
    if len(_rate_store) >= _RATE_STORE_MAX:
        expired = [k for k, (_, ts) in _rate_store.items() if (now - ts) >= settings.RATE_LIMIT_WINDOW]
        for k in expired:
            del _rate_store[k]
    entry = _rate_store.get(key)
    if entry is None or (now - entry[1]) >= settings.RATE_LIMIT_WINDOW:
        _rate_store[key] = (1, now)
        return False
    count, start = entry
    _rate_store[key] = (count + 1, start)
    return count + 1 > settings.RATE_LIMIT_MAX


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.method == "POST" and "/api/journalist/generate-content" in request.url.path:
        if await _is_rate_limited(request.client.host):
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded"},
                headers={"Retry-After": str(settings.RATE_LIMIT_WINDOW)},
            )
    return await call_next(request)


@app.middleware("http")
async def response_time_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Response-Time"] = f"{time.perf_counter() - start:.3f}s"
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth_router,     prefix="/api/auth",     tags=["auth"])
app.include_router(users_router,    prefix="/api/user",     tags=["users"])
app.include_router(articles_router, prefix="/api",          tags=["articles"])
app.include_router(voice_router,    prefix="/api/voice",    tags=["voice"])


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/", tags=["system"])
async def root():
    return {"service": settings.APP_NAME, "version": settings.APP_VERSION}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
