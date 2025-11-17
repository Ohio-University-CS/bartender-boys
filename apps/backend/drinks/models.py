from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class Drink(BaseModel):
    """Drink model matching the frontend interface."""

    id: str
    name: str
    category: str
    ingredients: list[str]
    instructions: str
    difficulty: Literal["Easy", "Medium", "Hard"]
    prepTime: str
    user_id: Optional[str] = Field(
        None, description="User ID (foreign key) who created/saved this drink"
    )
    image_url: Optional[str] = Field(None, description="URL of the drink image")
    favorited: Optional[bool] = Field(
        None, description="Whether the drink is favorited (optional, defaults to false)"
    )


class GenerateImageRequest(BaseModel):
    """Request model for image generation."""

    drink: Drink


class GenerateImageResponse(BaseModel):
    """Response model for image generation."""

    image_url: str
    drink_name: str


class DispenseStep(BaseModel):
    """Represents a single pump activation."""

    pump: str = Field(..., description="Identifier of the pump to activate")
    seconds: float = Field(..., gt=0, le=15, description="How long to run the pump")

    @field_validator("pump")
    def pump_must_not_be_empty(cls, value: str) -> str:  # noqa: D417 - pydantic validator signature
        if not value.strip():
            raise ValueError("pump must not be empty")
        return value


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
