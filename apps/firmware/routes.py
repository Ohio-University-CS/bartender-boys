import logging
from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from hardware import get_pump_controller

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/iot", tags=["IoT"])


class HardwareStep(BaseModel):
    pump: str = Field(..., description="Pump identifier to activate")
    seconds: float = Field(..., gt=0, le=15, description="Run time for the pump")


class Drink(BaseModel):
    """Drink model matching the frontend interface."""
    id: str
    name: str
    category: str
    ingredients: list[str]
    instructions: str
    difficulty: Literal['Easy', 'Medium', 'Hard']
    prepTime: str
    hardwareSteps: Optional[list[HardwareStep]] = None


class PourRequest(BaseModel):
    """Request model for receiving a drink from the main backend."""
    drink: Drink


class PourResponse(BaseModel):
    """Response model for drink requests."""
    status: Literal["ok", "error"]
    message: str


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
    logger.info(f"Received drink request: %s (ID: %s)", drink.name, drink.id)
    logger.info(
        "Category: %s, Difficulty: %s, Prep time: %s",
        drink.category,
        drink.difficulty,
        drink.prepTime,
    )

    steps = drink.hardwareSteps or []
    if not steps:
        logger.warning("No hardware steps supplied for drink '%s'", drink.name)
        return PourResponse(status="error", message="No hardware steps supplied")

    controller = get_pump_controller()
    paused_results: list[dict] = []

    try:
        paused_results = await controller.dispense_steps(
            [step.model_dump() for step in steps]
        )
    except ValueError as exc:
        logger.exception("Failed to dispense drink '%s'", drink.name)
        return PourResponse(status="error", message=str(exc))
    except Exception as exc:  # pragma: no cover - defensive guard for runtime faults.
        logger.exception("Unexpected failure while dispensing drink '%s'", drink.name)
        return PourResponse(status="error", message=f"Dispense failure: {exc}")

    logger.info("Dispense complete with %d steps", len(paused_results))

    mode = "hardware" if controller.hardware_available else "simulation"
    return PourResponse(status="ok", message=f"Dispense complete ({mode})")

