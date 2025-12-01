from fastapi import APIRouter, Header
from typing import Optional, Literal
from pydantic import BaseModel

router = APIRouter()


class DrinkRequest(BaseModel):
    """Request model for drink dispense."""
    drink: dict


class DrinkResponse(BaseModel):
    """Response model for drink dispense."""
    status: Literal["ok", "error"]
    message: str


@router.post("/iot/drink", response_model=DrinkResponse)
async def receive_drink_request(
    request: DrinkRequest,
    x_firmware_token: Optional[str] = Header(None, alias="X-Firmware-Token"),
    authorization: Optional[str] = Header(None),
):
    """
    Receive a drink request from the backend.
    
    This endpoint accepts pour requests from the backend and processes them
    for hardware dispense.
    """
    # TODO: Implement actual hardware dispense logic
    # For now, just acknowledge receipt
    
    drink = request.drink
    drink_name = drink.get("name", "Unknown drink")
    
    return DrinkResponse(
        status="ok",
        message=f"Received drink request for {drink_name}. Dispense logic to be implemented.",
    )

