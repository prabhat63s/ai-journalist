import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel
from loguru import logger
from app.core.config import settings


class Database:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_to_storage(cls):
        if not settings.DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not set — cannot connect to MongoDB")
        try:
            cls.client = AsyncIOMotorClient(
                settings.DATABASE_URL,
                tlsCAFile=certifi.where(),
                # Connection pool — handles concurrent async requests without queueing
                maxPoolSize=20,
                minPoolSize=2,
                # Fail fast so a bad Atlas connection surfaces immediately on startup
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                socketTimeoutMS=30000,
                retryWrites=True,
            )
            db_name = settings.DATABASE_URL.split("/")[-1].split("?")[0] or "ai_journalist"
            cls.db = cls.client[db_name]
            # Verify the connection is live before accepting traffic
            await cls.client.admin.command("ping")
            logger.info(f"Connected to MongoDB: {db_name}")
            await cls._ensure_indexes()
        except Exception as e:
            raise RuntimeError(f"Could not connect to MongoDB: {e}") from e

    @classmethod
    async def _ensure_indexes(cls):
        """
        Create all indexes on startup. MongoDB ignores duplicate index requests,
        so this is always safe to call and is idempotent.
        """

        # ── users ──────────────────────────────────────────────────────────────
        # Every auth/preference query filters on email.
        await cls.db.users.create_indexes([
            IndexModel(
                [("email", ASCENDING)],
                unique=True,
                name="users_email_unique",
            ),
        ])

        # ── reports ────────────────────────────────────────────────────────────
        # GET /reports + GET /sessions  → filter user_email, sort created_at DESC
        # DELETE /reports/:id           → filter id + user_email
        # POST /reports/:id/save        → filter id + user_email
        await cls.db.reports.create_indexes([
            IndexModel(
                [("user_email", ASCENDING), ("created_at", DESCENDING)],
                name="reports_user_email_created_at",
            ),
            IndexModel(
                [("id", ASCENDING), ("user_email", ASCENDING)],
                unique=True,
                name="reports_id_user_email_unique",
            ),
        ])

        # ── conversations ──────────────────────────────────────────────────────
        # GET /conversations            → filter user_email, sort updated_at DESC
        # GET /conversations/:id        → filter id + user_email
        # POST /conversations           → upsert on id + user_email
        # DELETE /conversations/:id     → filter id + user_email
        await cls.db.conversations.create_indexes([
            IndexModel(
                [("user_email", ASCENDING), ("updated_at", DESCENDING)],
                name="conversations_user_email_updated_at",
            ),
            IndexModel(
                [("id", ASCENDING), ("user_email", ASCENDING)],
                unique=True,
                name="conversations_id_user_email_unique",
            ),
        ])

        logger.info("MongoDB indexes verified")

    @classmethod
    async def close_storage_connection(cls):
        if cls.client:
            cls.client.close()
            logger.info("Closed MongoDB connection")


db = Database
