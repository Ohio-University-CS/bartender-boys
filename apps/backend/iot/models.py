from typing import Literal

from pydantic import BaseModel
from drinks.models import Drink


class PourRequest(BaseModel):
    """Request to send a drink to the firmware API."""

    drink: Drink


class PourResponse(BaseModel):
    """Response from firmware API after receiving a drink request."""

    status: Literal["ok", "error"]
    message: str
