from typing import AsyncGenerator, Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from settings import settings


_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create required indexes for collections used by the application."""
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


