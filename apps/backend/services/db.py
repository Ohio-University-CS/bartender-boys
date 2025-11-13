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
                logger.info(
                    "Dropped non-partial index driversLicenseNumber_1 on users collection"
                )
            except Exception as drop_err:
                logger.warning(
                    "Could not drop index driversLicenseNumber_1: %s", drop_err
                )

        await users.create_index(
            "driversLicenseNumber",
            unique=True,
            partialFilterExpression={"driversLicenseNumber": {"$type": "string"}},
        )
        logger.info("Ensured partial unique index on users.driversLicenseNumber")
    except Exception as e:
        logger.warning("Failed ensuring users indexes: %s", e)

    # Ensure drinks collection indexes
    drinks = db["drinks"]
    try:
        # Index on user_id for efficient queries by user
        await drinks.create_index("user_id")
        logger.info("Ensured index on drinks.user_id")

        # Index on created_at for efficient sorting
        await drinks.create_index("created_at")
        logger.info("Ensured index on drinks.created_at")

        # Compound index for user_id + created_at (common query pattern)
        await drinks.create_index([("user_id", 1), ("created_at", -1)])
        logger.info("Ensured compound index on drinks.user_id and created_at")
    except Exception as e:
        logger.warning("Failed ensuring drinks indexes: %s", e)

    # Ensure conversations collection indexes
    conversations = db["conversations"]
    try:
        # Index on user_id for efficient queries by user
        await conversations.create_index("user_id")
        logger.info("Ensured index on conversations.user_id")

        # Index on updated_at for efficient sorting
        await conversations.create_index("updated_at")
        logger.info("Ensured index on conversations.updated_at")

        # Compound index for user_id + updated_at (common query pattern)
        await conversations.create_index([("user_id", 1), ("updated_at", -1)])
        logger.info("Ensured compound index on conversations.user_id and updated_at")
    except Exception as e:
        logger.warning("Failed ensuring conversations indexes: %s", e)

    # Ensure chats collection indexes
    chats = db["chats"]
    try:
        # Index on conversation_id for efficient queries by conversation
        await chats.create_index("conversation_id")
        logger.info("Ensured index on chats.conversation_id")

        # Index on created_at for efficient sorting
        await chats.create_index("created_at")
        logger.info("Ensured index on chats.created_at")

        # Compound index for conversation_id + created_at (common query pattern)
        await chats.create_index([("conversation_id", 1), ("created_at", 1)])
        logger.info("Ensured compound index on chats.conversation_id and created_at")
    except Exception as e:
        logger.warning("Failed ensuring chats indexes: %s", e)

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
