from typing import Literal, Optional

from pydantic import BaseModel
from drinks.models import Drink


class PourRequest(BaseModel):
    """Request to send a drink to the firmware API."""

    drink: Drink
    user_id: Optional[str] = None


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


class PumpConfig(BaseModel):
    """Pump configuration model for storing ingredient assignments."""

    user_id: str
    pump1: Optional[str] = None
    pump2: Optional[str] = None
    pump3: Optional[str] = None


class PumpConfigRequest(BaseModel):
    """Request model for creating/updating pump configuration."""

    user_id: str
    pump1: Optional[str] = None
    pump2: Optional[str] = None
    pump3: Optional[str] = None


class PumpConfigResponse(BaseModel):
    """Response model for pump configuration."""

    user_id: str
    pump1: Optional[str] = None
    pump2: Optional[str] = None
    pump3: Optional[str] = None
