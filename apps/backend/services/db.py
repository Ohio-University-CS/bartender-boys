from typing import AsyncGenerator, Optional
import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from settings import settings


_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None
logger = logging.getLogger(__name__)


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create required indexes for collections used by the application."""
    users = db["users"]

    # Ensure the users index on driversLicenseNumber is partial unique
    try:
        existing_names = [idx.get("name") async for idx in users.list_indexes()]
        if "driversLicenseNumber_1" in existing_names:
            try:
                await users.drop_index("driversLicenseNumber_1")
                logger.info("Dropped non-partial index driversLicenseNumber_1 on users collection")
            except Exception as drop_err:
                logger.warning("Could not drop index driversLicenseNumber_1: %s", drop_err)

        await users.create_index(
            "driversLicenseNumber",
            unique=True,
            partialFilterExpression={"driversLicenseNumber": {"$exists": True, "$ne": None}},
        )
        logger.info("Ensured partial unique index on users.driversLicenseNumber")
    except Exception as e:
        logger.warning("Failed ensuring users indexes: %s", e)

    # Example:
    # await db["drinks"].create_index([("name", 1)], unique=True)
    return None


async def connect_to_mongo() -> None:
    """Initialize the MongoDB client and database handle."""
    global _client, _db
    if not settings.MONGODB_URI:
        raise RuntimeError("MONGODB_URI is not set")
    _client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
    _db = _client[settings.MONGODB_DB]
    await ensure_indexes(_db)


async def close_mongo_connection() -> None:
    """Close the MongoDB client connection."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


def get_db_handle() -> AsyncIOMotorDatabase:
    """Return the active database handle or raise if uninitialized."""
    if _db is None:
        raise RuntimeError("Database not initialized. Did you call connect_to_mongo()?")
    return _db


async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """FastAPI dependency that yields a database handle."""
    yield get_db_handle()


