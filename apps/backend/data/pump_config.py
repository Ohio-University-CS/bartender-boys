import logging
import re
from datetime import datetime
from typing import Optional, Dict, Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from services.db import get_db_handle


logger = logging.getLogger(__name__)


def normalize_to_snake_case(text: str) -> str:
    """Normalize a string to snake_case.

    Args:
        text: Input string to normalize

    Returns:
        Normalized snake_case string
    """
    if not text:
        return ""
    # Convert to lowercase and replace spaces/special chars with underscores
    text = text.lower().strip()
    # Replace spaces and special characters with underscores
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s-]+", "_", text)
    # Remove leading/trailing underscores
    text = text.strip("_")
    return text


async def get_pump_config(
    user_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Optional[Dict[str, Any]]:
    """Get pump configuration for a user.

    Args:
        user_id: User ID to fetch config for
        db: Optional database handle (will get default if not provided)

    Returns:
        Pump config document or None if not found
    """
    if db is None:
        db = get_db_handle()

    config = await db["pumpConfig"].find_one({"user_id": user_id})
    if config:
        logger.info("Retrieved pump config for user: %s", user_id)
    else:
        logger.info("Pump config not found for user: %s", user_id)
    return config


async def create_or_update_pump_config(
    user_id: str,
    pump1: Optional[str] = None,
    pump2: Optional[str] = None,
    pump3: Optional[str] = None,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Dict[str, Any]:
    """Create or update pump configuration for a user.

    Args:
        user_id: User ID
        pump1: Ingredient name for pump 1 (normalized to snake_case)
        pump2: Ingredient name for pump 2 (normalized to snake_case)
        pump3: Ingredient name for pump 3 (normalized to snake_case)
        db: Optional database handle (will get default if not provided)

    Returns:
        The created/updated pump config document
    """
    if db is None:
        db = get_db_handle()

    # Normalize pump values to snake_case (empty strings become None)
    normalized_pump1 = normalize_to_snake_case(pump1) if pump1 else None
    normalized_pump2 = normalize_to_snake_case(pump2) if pump2 else None
    normalized_pump3 = normalize_to_snake_case(pump3) if pump3 else None

    # Convert empty strings to None
    normalized_pump1 = normalized_pump1 if normalized_pump1 else None
    normalized_pump2 = normalized_pump2 if normalized_pump2 else None
    normalized_pump3 = normalized_pump3 if normalized_pump3 else None

    now = datetime.utcnow()

    # Prepare document for upsert
    config_doc = {
        "user_id": user_id,
        "pump1": normalized_pump1,
        "pump2": normalized_pump2,
        "pump3": normalized_pump3,
        "updated_at": now,
    }

    # Check if config exists
    existing = await db["pumpConfig"].find_one({"user_id": user_id})

    if existing:
        # Update existing config
        config_doc["created_at"] = existing.get("created_at", now)
        await db["pumpConfig"].update_one({"user_id": user_id}, {"$set": config_doc})
        logger.info("Updated pump config for user: %s", user_id)
    else:
        # Create new config
        config_doc["created_at"] = now
        await db["pumpConfig"].insert_one(config_doc)
        logger.info("Created pump config for user: %s", user_id)

    return config_doc
