from typing import Literal, Optional

from pydantic import BaseModel
from drinks.models import Drink


class PourRequest(BaseModel):
    """Request to send a drink to the firmware API."""

    drink: Drink


class SelectedPump(BaseModel):
    """Details about the pump that was selected for dispensing."""

    id: str
    label: str
    gpio_pin: int
    liquid: Optional[str] = None
    target_volume_ml: Optional[float] = None


class PourResponse(BaseModel):
    """Response from firmware API after receiving a drink request."""

    status: Literal["ok", "error"]
    message: str
    selected_pump: Optional[SelectedPump] = None
