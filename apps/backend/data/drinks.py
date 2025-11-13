import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from bson import ObjectId

from motor.motor_asyncio import AsyncIOMotorDatabase

from services.db import get_db_handle
from drinks.models import Drink


logger = logging.getLogger(__name__)


async def create_drink(
    drink: Drink,
    user_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Dict[str, Any]:
    """Create a new drink document in the database.

    Args:
        drink: Drink model instance
        user_id: User ID (foreign key) who created this drink
        db: Optional database handle (will get default if not provided)

    Returns:
        The created drink document
    """
    if db is None:
        db = get_db_handle()

    now = datetime.utcnow()

    # Convert drink to dict and add database fields
    drink_doc = drink.model_dump()
    drink_doc["user_id"] = user_id
    drink_doc["created_at"] = now
    drink_doc["updated_at"] = now

    # Use drink.id as _id if provided, otherwise generate ObjectId
    if drink.id:
        drink_doc["_id"] = drink.id
    else:
        drink_doc["_id"] = str(ObjectId())
        drink_doc["id"] = drink_doc["_id"]

    await db["drinks"].insert_one(drink_doc)
    logger.info(
        "Created new drink record: %s (ID: %s) for user: %s",
        drink.name,
        drink_doc["_id"],
        user_id,
    )
    return drink_doc


async def get_drinks_by_user(
    user_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> List[Dict[str, Any]]:
    """Get all drinks for a specific user.

    Args:
        user_id: User ID to filter drinks by
        db: Optional database handle (will get default if not provided)

    Returns:
        List of drink documents
    """
    if db is None:
        db = get_db_handle()

    cursor = db["drinks"].find({"user_id": user_id}).sort("created_at", -1)
    drinks = await cursor.to_list(length=None)
    logger.info("Retrieved %d drinks for user: %s", len(drinks), user_id)
    return drinks


async def get_drinks_paginated(
    skip: int = 0,
    limit: int = 20,
    user_id: Optional[str] = None,
    category: Optional[str] = None,
    favorited: Optional[bool] = None,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> tuple[List[Dict[str, Any]], int]:
    """Get drinks with pagination.

    Args:
        skip: Number of documents to skip
        limit: Maximum number of documents to return
        user_id: Optional user ID to filter by
        category: Optional category to filter by
        favorited: Optional boolean to filter by favorited status
        db: Optional database handle (will get default if not provided)

    Returns:
        Tuple of (list of drink documents, total count)
    """
    if db is None:
        db = get_db_handle()

    # Build query filter
    query_filter: Dict[str, Any] = {}
    if user_id:
        query_filter["user_id"] = user_id
    if category:
        query_filter["category"] = category
    if favorited is not None:
        # If favorited is True, only get drinks where favorited is True
        # If favorited is False, get drinks where favorited is False or null/undefined
        if favorited:
            query_filter["favorited"] = True
        else:
            query_filter["$or"] = [
                {"favorited": False},
                {"favorited": {"$exists": False}},
            ]

    # Get total count
    total_count = await db["drinks"].count_documents(query_filter)

    # Get paginated results
    cursor = (
        db["drinks"].find(query_filter).sort("created_at", -1).skip(skip).limit(limit)
    )
    drinks = await cursor.to_list(length=limit)

    logger.info(
        "Retrieved %d drinks (skip=%d, limit=%d, total=%d)",
        len(drinks),
        skip,
        limit,
        total_count,
    )
    return drinks, total_count


async def get_drink_by_id(
    drink_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Optional[Dict[str, Any]]:
    """Get a drink by its ID.

    Args:
        drink_id: Drink ID
        db: Optional database handle (will get default if not provided)

    Returns:
        Drink document or None if not found
    """
    if db is None:
        db = get_db_handle()

    drink = await db["drinks"].find_one({"_id": drink_id})
    if drink:
        logger.info("Retrieved drink: %s (ID: %s)", drink.get("name"), drink_id)
    else:
        logger.info("Drink not found: %s", drink_id)
    return drink


async def update_drink(
    drink_id: str,
    drink: Drink,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Optional[Dict[str, Any]]:
    """Update an existing drink document.

    Args:
        drink_id: Drink ID to update
        drink: Updated drink model instance
        db: Optional database handle (will get default if not provided)

    Returns:
        Updated drink document or None if not found
    """
    if db is None:
        db = get_db_handle()

    # Convert drink to dict and update timestamp
    update_doc = drink.model_dump()
    update_doc["updated_at"] = datetime.utcnow()

    # Remove _id from update doc to avoid conflicts
    update_doc.pop("_id", None)

    result = await db["drinks"].find_one_and_update(
        {"_id": drink_id},
        {"$set": update_doc},
        return_document=True,
    )

    if result:
        logger.info("Updated drink: %s (ID: %s)", drink.name, drink_id)
    else:
        logger.info("Drink not found for update: %s", drink_id)
    return result


async def delete_drink(
    drink_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> bool:
    """Delete a drink document.

    Args:
        drink_id: Drink ID to delete
        db: Optional database handle (will get default if not provided)

    Returns:
        True if deleted, False if not found
    """
    if db is None:
        db = get_db_handle()

    result = await db["drinks"].delete_one({"_id": drink_id})
    deleted = result.deleted_count > 0

    if deleted:
        logger.info("Deleted drink: %s", drink_id)
    else:
        logger.info("Drink not found for deletion: %s", drink_id)
    return deleted
