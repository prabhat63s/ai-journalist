from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.articles import router as articles_router
from app.routers.voice import router as voice_router

__all__ = ["auth_router", "users_router", "articles_router", "voice_router"]
