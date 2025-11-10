"""
Drinks database operations.

This module handles all database interactions for drinks, favorites, and chat history.
All functions that interact with the drinks collection should be in this file.
"""
import logging
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from motor.motor_asyncio import AsyncIOMotorDatabase  # type: ignore

from services.db import get_db_handle


logger = logging.getLogger(__name__)


# ============================================================================
# Favorites Operations
# ============================================================================

async def add_favorite_drink(
    user_id: str,
    drink_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Dict[str, Any]:
    """Add a drink to a user's favorites.
    
    Args:
        user_id: The user's driver's license number (or user identifier)
        drink_id: The drink ID to add to favorites
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        The favorite document that was created or already existed
    """
    if db is None:
        db = get_db_handle()
    
    now = datetime.utcnow()
    
    # Check if favorite already exists
    existing = await db["favorites"].find_one({
        "user_id": user_id,
        "drink_id": drink_id
    })
    
    if existing:
        logger.info("Favorite already exists for user %s and drink %s", user_id, drink_id)
        return existing
    
    # Create new favorite document
    favorite_doc = {
        "user_id": user_id,
        "drink_id": drink_id,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db["favorites"].insert_one(favorite_doc)
    favorite_doc["_id"] = result.inserted_id
    logger.info("Added favorite drink %s for user %s", drink_id, user_id)
    
    return favorite_doc


async def remove_favorite_drink(
    user_id: str,
    drink_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> bool:
    """Remove a drink from a user's favorites.
    
    Args:
        user_id: The user's driver's license number (or user identifier)
        drink_id: The drink ID to remove from favorites
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        True if a favorite was removed, False if it didn't exist
    """
    if db is None:
        db = get_db_handle()
    
    result = await db["favorites"].delete_one({
        "user_id": user_id,
        "drink_id": drink_id
    })
    
    if result.deleted_count > 0:
        logger.info("Removed favorite drink %s for user %s", drink_id, user_id)
        return True
    else:
        logger.info("Favorite drink %s not found for user %s", drink_id, user_id)
        return False


async def get_user_favorites(
    user_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> List[str]:
    """Get all favorite drink IDs for a user.
    
    Args:
        user_id: The user's driver's license number (or user identifier)
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        List of drink IDs that the user has favorited
    """
    if db is None:
        db = get_db_handle()
    
    cursor = db["favorites"].find({"user_id": user_id})
    favorites = await cursor.to_list(length=None)
    
    drink_ids = [fav["drink_id"] for fav in favorites]
    logger.info("Retrieved %d favorites for user %s", len(drink_ids), user_id)
    
    return drink_ids


async def is_drink_favorited(
    user_id: str,
    drink_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> bool:
    """Check if a drink is favorited by a user.
    
    Args:
        user_id: The user's driver's license number (or user identifier)
        drink_id: The drink ID to check
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        True if the drink is favorited, False otherwise
    """
    if db is None:
        db = get_db_handle()
    
    favorite = await db["favorites"].find_one({
        "user_id": user_id,
        "drink_id": drink_id
    })
    
    return favorite is not None


# ============================================================================
# Chat History Operations
# ============================================================================

async def save_chat_message(
    user_id: str,
    role: str,
    content: str,
    drink_id: Optional[str] = None,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Dict[str, Any]:
    """Save a chat message to the database.
    
    Args:
        user_id: The user's driver's license number (or user identifier)
        role: Message role ('user', 'assistant', or 'system')
        content: The message content
        drink_id: Optional drink ID if the message is related to a specific drink
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        The saved chat message document
    """
    if db is None:
        db = get_db_handle()
    
    now = datetime.utcnow()
    
    chat_doc = {
        "user_id": user_id,
        "role": role,
        "content": content,
        "created_at": now,
    }
    
    if drink_id:
        chat_doc["drink_id"] = drink_id
    
    result = await db["chat_history"].insert_one(chat_doc)
    chat_doc["_id"] = result.inserted_id
    logger.info("Saved chat message for user %s (role: %s)", user_id, role)
    
    return chat_doc


async def get_user_chat_history(
    user_id: str,
    limit: int = 50,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> List[Dict[str, Any]]:
    """Get chat history for a user.
    
    Args:
        user_id: The user's driver's license number (or user identifier)
        limit: Maximum number of messages to retrieve (default: 50)
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        List of chat message documents, ordered by creation time (newest first)
    """
    if db is None:
        db = get_db_handle()
    
    cursor = db["chat_history"].find({"user_id": user_id}).sort("created_at", -1).limit(limit)
    messages = await cursor.to_list(length=limit)
    
    # Reverse to get chronological order (oldest first)
    messages.reverse()
    logger.info("Retrieved %d chat messages for user %s", len(messages), user_id)
    
    return messages


async def get_chat_history_for_drink(
    user_id: str,
    drink_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> List[Dict[str, Any]]:
    """Get chat history related to a specific drink.
    
    Args:
        user_id: The user's driver's license number (or user identifier)
        drink_id: The drink ID to filter by
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        List of chat message documents related to the drink
    """
    if db is None:
        db = get_db_handle()
    
    cursor = db["chat_history"].find({
        "user_id": user_id,
        "drink_id": drink_id
    }).sort("created_at", 1)
    
    messages = await cursor.to_list(length=None)
    logger.info("Retrieved %d chat messages for user %s and drink %s", len(messages), user_id, drink_id)
    
    return messages


# ============================================================================
# Custom Drinks Operations
# ============================================================================

async def save_custom_drink(
    user_id: str,
    drink_data: Dict[str, Any],
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Dict[str, Any]:
    """Save a custom drink created by a user.
    
    Args:
        user_id: The user's driver's license number (or user identifier)
        drink_data: Dictionary containing drink information (name, category, ingredients, etc.)
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        The saved custom drink document
    """
    if db is None:
        db = get_db_handle()
    
    now = datetime.utcnow()
    
    # Create custom drink document
    custom_drink = dict(drink_data)
    custom_drink["user_id"] = user_id
    custom_drink["created_at"] = now
    custom_drink["updated_at"] = now
    custom_drink["is_custom"] = True
    
    # Generate a unique ID if not provided
    if "id" not in custom_drink:
        # Use UUID for uniqueness
        custom_drink["id"] = str(uuid.uuid4())
    
    result = await db["custom_drinks"].insert_one(custom_drink)
    custom_drink["_id"] = result.inserted_id
    logger.info("Saved custom drink '%s' for user %s", custom_drink.get("name"), user_id)
    
    return custom_drink


async def get_user_custom_drinks(
    user_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> List[Dict[str, Any]]:
    """Get all custom drinks created by a user.
    
    Args:
        user_id: The user's driver's license number (or user identifier)
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        List of custom drink documents
    """
    if db is None:
        db = get_db_handle()
    
    cursor = db["custom_drinks"].find({"user_id": user_id}).sort("created_at", -1)
    drinks = await cursor.to_list(length=None)
    
    logger.info("Retrieved %d custom drinks for user %s", len(drinks), user_id)
    return drinks


async def update_custom_drink(
    user_id: str,
    drink_id: str,
    drink_data: Dict[str, Any],
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Optional[Dict[str, Any]]:
    """Update a custom drink created by a user.
    
    Args:
        user_id: The user's driver's license number (or user identifier)
        drink_id: The drink ID to update
        drink_data: Dictionary containing updated drink information
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        The updated drink document, or None if not found
    """
    if db is None:
        db = get_db_handle()
    
    # Only allow updating drinks owned by the user
    update_data = dict(drink_data)
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db["custom_drinks"].find_one_and_update(
        {"user_id": user_id, "id": drink_id},
        {"$set": update_data},
        return_document=True
    )
    
    if result:
        logger.info("Updated custom drink %s for user %s", drink_id, user_id)
    else:
        logger.warning("Custom drink %s not found for user %s", drink_id, user_id)
    
    return result


async def delete_custom_drink(
    user_id: str,
    drink_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> bool:
    """Delete a custom drink created by a user.
    
    Args:
        user_id: The user's driver's license number (or user identifier)
        drink_id: The drink ID to delete
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        True if the drink was deleted, False if it didn't exist
    """
    if db is None:
        db = get_db_handle()
    
    result = await db["custom_drinks"].delete_one({
        "user_id": user_id,
        "id": drink_id
    })
    
    if result.deleted_count > 0:
        logger.info("Deleted custom drink %s for user %s", drink_id, user_id)
        return True
    else:
        logger.warning("Custom drink %s not found for user %s", drink_id, user_id)
        return False


# ============================================================================
# General Drink Operations
# ============================================================================

async def get_drink_by_id(
    drink_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Optional[Dict[str, Any]]:
    """Get a drink by its ID (checks both standard and custom drinks).
    
    Args:
        drink_id: The drink ID to look up
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        The drink document if found, None otherwise
    """
    if db is None:
        db = get_db_handle()
    
    # First check custom drinks
    custom_drink = await db["custom_drinks"].find_one({"id": drink_id})
    if custom_drink:
        return custom_drink
    
    # If not found in custom drinks, it's likely a standard drink from the frontend constants
    # You might want to add a standard_drinks collection if you want to store them in DB
    logger.info("Drink %s not found in database (may be standard drink)", drink_id)
    return None


async def search_drinks(
    query: Optional[str] = None,
    category: Optional[str] = None,
    user_id: Optional[str] = None,
    include_custom: bool = True,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> List[Dict[str, Any]]:
    """Search for drinks with optional filters.
    
    Args:
        query: Optional search query to match against drink name or ingredients
        category: Optional category filter
        user_id: If provided, only return custom drinks for this user
        include_custom: Whether to include custom drinks in results
        db: Optional database handle (will use get_db_handle() if not provided)
        
    Returns:
        List of matching drink documents
    """
    if db is None:
        db = get_db_handle()
    
    search_filter: Dict[str, Any] = {}
    
    if user_id and include_custom:
        search_filter["user_id"] = user_id
    elif not include_custom:
        # Only search standard drinks (if you have a standard_drinks collection)
        pass
    
    if category:
        search_filter["category"] = category
    
    if query:
        search_filter["$or"] = [
            {"name": {"$regex": query, "$options": "i"}},
            {"ingredients": {"$regex": query, "$options": "i"}},
        ]
    
    cursor = db["custom_drinks"].find(search_filter).sort("created_at", -1)
    drinks = await cursor.to_list(length=None)
    
    logger.info("Found %d drinks matching search criteria", len(drinks))
    return drinks

