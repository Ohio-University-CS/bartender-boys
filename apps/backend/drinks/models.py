from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, validator


class DispenseStep(BaseModel):
    """Represents a single pump activation (matches Pi firmware schema)."""

    pump: str = Field(..., description="Identifier of the pump to activate")
    seconds: Optional[float] = Field(
        default=None,
        gt=0,
        description="How long to run the pump (takes precedence over ml)",
    )
    ml: Optional[float] = Field(
        default=None,
        gt=0,
        description="Target volume; converted to seconds using flow rates",
    )
    prime: bool = Field(
        default=False, description="Use prime time from defaults regardless of ml/seconds"
    )
    description: Optional[str] = Field(
        default=None, description="Optional label describing the step purpose"
    )

    @validator("pump")
    def pump_must_not_be_empty(cls, value: str) -> str:  # noqa: D417 - pydantic validator signature
        if not value.strip():
            raise ValueError("pump must not be empty")
        return value

    class Config:
        allow_population_by_field_name = True


class DispensePlan(BaseModel):
    """Complete dispense plan consisting of multiple steps."""

    steps: list[DispenseStep]
    pause_between: float = Field(
        0.25, ge=0, le=5, description="Optional pause between steps"
    )


class Drink(BaseModel):
    """Drink model matching the frontend + firmware interface."""

    id: str
    name: str
    category: str
    ingredients: list[str]
    ratios: Optional[list[int]] = Field(
        None,
        description="Percentage ratios for each ingredient (must sum to 100). Each ratio corresponds to the ingredient at the same index.",
    )
    instructions: str
    difficulty: Literal["Easy", "Medium", "Hard"]
    prepTime: str
    hardware_steps: Optional[list[DispenseStep]] = Field(
        default=None,
        alias="hardwareSteps",
        description="Explicit pump steps to run on the Pi",
    )
    dispense: Optional[DispensePlan] = Field(
        default=None,
        description="Alternate dispense plan payload (Pi 2.0 schema)",
    )
    user_id: Optional[str] = Field(
        None, description="User ID (foreign key) who created/saved this drink"
    )
    image_url: Optional[str] = Field(None, description="URL of the drink image")
    image_data: Optional[str] = Field(None, description="Base64-encoded image data as data URI (data:image/png;base64,...)")
    favorited: Optional[bool] = Field(
        None, description="Whether the drink is favorited (optional, defaults to false)"
    )
    created_at: Optional[datetime] = Field(
        None, description="Date and time when the drink was created"
    )

    @validator("ratios")
    def ratios_must_sum_to_100(cls, v, values):
        """Validate that ratios sum to 100 if provided."""
        if v is not None:
            ingredients = values.get("ingredients", [])
            if ingredients and len(v) != len(ingredients):
                raise ValueError("ratios must have the same length as ingredients")
            if sum(v) != 100:
                raise ValueError("ratios must sum to 100")
        return v

    class Config:
        allow_population_by_field_name = True
        allow_population_by_alias = True


class GenerateImageRequest(BaseModel):
    """Request model for image generation."""

    drink: Drink


class GenerateImageResponse(BaseModel):
    """Response model for image generation."""

    image_url: str
    drink_name: str


class DispenseRequest(BaseModel):
    """Incoming request to dispense a drink sequence."""

    steps: list[DispenseStep]
    pause_between: float = Field(
        0.0, ge=0, le=5, description="Optional pause between steps"
    )


class DispenseResponse(BaseModel):
    """Response returned after attempting a dispense sequence."""

    status: Literal["ok"]
    results: list[dict]


class GenerateDrinkRequest(BaseModel):
    """Request model for generating a complete drink with image."""

    name: str
    category: str
    ingredients: list[str]
    ratios: Optional[list[int]] = Field(
        None,
        description="Percentage ratios for each ingredient (must sum to 100). If not provided, will be auto-generated.",
    )
    instructions: str
    difficulty: Literal["Easy", "Medium", "Hard"]
    prepTime: str
    user_id: str = Field(
        ..., description="User ID (foreign key) who is creating this drink"
    )


class GenerateDrinkResponse(BaseModel):
    """Response model for generated drink."""

    drink: Drink


class DrinksListResponse(BaseModel):
    """Response model for paginated drinks list."""

    drinks: list[Drink]
    total: int
    skip: int
    limit: int
    has_more: bool
