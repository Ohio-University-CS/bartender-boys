import json
import logging
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/iot", tags=["IoT"])


class Drink(BaseModel):
    """Drink model matching the frontend interface."""
    id: str
    name: str
    category: str
    ingredients: list[str]
    instructions: str
    difficulty: Literal['Easy', 'Medium', 'Hard']
    prepTime: str


class PourRequest(BaseModel):
    """Request model for receiving a drink from the main backend."""
    drink: Drink


class PourResponse(BaseModel):
    """Response model for drink requests."""
    status: Literal["ok", "error"]
    message: str


class HardwareMapping(BaseModel):
    """Mapping between logical components and physical GPIO pins."""

    pumps: dict[str, int]
    flow_rates_ml_per_second: dict[str, float] | None = None
    defaults: dict[str, float] | None = None


def load_hardware_mapping() -> HardwareMapping | None:
    """Load the Raspberry Pi hardware mapping if present."""
    config_path = Path(__file__).resolve().parent.parent / "backend" / "config" / "pi_mapping.json"
    if not config_path.exists():
        logger.info("Hardware mapping file not found at %s", config_path)
        return None

    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
        return HardwareMapping.model_validate(data)
    except Exception as exc:  # Broad to capture JSON or validation errors
        logger.error("Failed to load hardware mapping: %s", exc)
        raise HTTPException(status_code=500, detail="Invalid hardware mapping configuration")


@router.post("/drink", response_model=PourResponse)
async def receive_drink_request(request: PourRequest) -> PourResponse:
    """
    Receive a drink request from the main backend.
    For now, just logs the drink information.
    
    Args:
        request: Drink request containing the drink object
        
    Returns:
        Response confirming receipt
    """
    drink = request.drink
    logger.info(f"Received drink request: {drink.name} (ID: {drink.id})")
    logger.info(f"Category: {drink.category}, Difficulty: {drink.difficulty}")
    logger.info(f"Ingredients: {', '.join(drink.ingredients)}")
    logger.info(f"Instructions: {drink.instructions}")
    logger.info(f"Prep time: {drink.prepTime}")

    mapping = load_hardware_mapping()
    if mapping:
        logger.info("Loaded hardware mapping for pumps: %s", mapping.pumps)
    else:
        logger.warning("No hardware mapping configured; operating in logging-only mode")
    
    return PourResponse(
        status="ok",
        message=f"Drink request received: {drink.name}"
    )

