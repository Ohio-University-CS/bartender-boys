import logging
from datetime import datetime, time
from typing import Optional, Dict, Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from services.db import get_db_handle


logger = logging.getLogger(__name__)


async def get_or_insert_user_from_id_scan(
    cleaned_data: Dict[str, Any],
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Dict[str, Any]:
    """Return existing user by DL if present; otherwise insert a new record and return it.

    - Uses driver's license number as `_id`.
    - Does NOT update existing records.
    - On insert, adds created_at/updated_at timestamps and normalizes date_of_birth.
    Returns the user document (existing or newly created).
    """
    dl_number = cleaned_data.get("drivers_license_number")
    if not dl_number:
        logger.warning("No driver's license number found; cannot fetch/insert user")
        return dict(cleaned_data)

    if db is None:
        db = get_db_handle()

    # If exists, return without modifying
    existing = await db["users"].find_one({"_id": dl_number})
    if existing:
        logger.info(
            "Found existing user for DL %s; returning without modification", dl_number
        )
        return existing

    # Prepare document for insert
    user_doc = dict(cleaned_data)
    dob_value = user_doc.get("date_of_birth")
    if dob_value is not None:
        try:
            if isinstance(dob_value, datetime):
                pass
            else:
                user_doc["date_of_birth"] = datetime.combine(dob_value, time.min)
        except Exception:
            user_doc["date_of_birth"] = str(dob_value)

    now = datetime.utcnow()
    user_doc["_id"] = dl_number
    user_doc["created_at"] = now
    user_doc["updated_at"] = now

    await db["users"].insert_one(user_doc)
    logger.info("Inserted new user record in MongoDB for DL %s", dl_number)
    return user_doc


async def get_user_by_id(
    user_id: str,
    db: Optional[AsyncIOMotorDatabase] = None,
) -> Optional[Dict[str, Any]]:
    """Get user data by user ID (drivers_license_number).
    
    Args:
        user_id: User ID (drivers_license_number)
        db: Optional database handle (will get default if not provided)
        
    Returns:
        User document or None if not found
    """
    if db is None:
        db = get_db_handle()
    
    user = await db["users"].find_one({"_id": user_id})
    if user:
        logger.info("Retrieved user data for user_id: %s", user_id)
    else:
        logger.info("User not found for user_id: %s", user_id)
    return user
