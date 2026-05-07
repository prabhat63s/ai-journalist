import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from loguru import logger

class Database:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_to_storage(cls):
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            logger.error("DATABASE_URL not found in environment variables")
            return
        
        try:
            cls.client = AsyncIOMotorClient(database_url, tlsCAFile=certifi.where())
            # Try to get database name from URL if possible, else default to 'ai_journalist'
            db_name = database_url.split("/")[-1].split("?")[0] or "ai_journalist"
            cls.db = cls.client[db_name]
            logger.info(f"Connected to MongoDB: {db_name}")
        except Exception as e:
            logger.error(f"Could not connect to MongoDB: {e}")

    @classmethod
    async def close_storage_connection(cls):
        if cls.client:
            cls.client.close()
            logger.info("Closed MongoDB connection")

db = Database
