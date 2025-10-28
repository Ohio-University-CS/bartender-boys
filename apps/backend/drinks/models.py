from pydantic import BaseModel
from typing import Literal


class Drink(BaseModel):
    """Drink model matching the frontend interface."""
    id: str
    name: str
    category: str
    ingredients: list[str]
    instructions: str
    difficulty: Literal['Easy', 'Medium', 'Hard']
    prepTime: str


class GenerateImageRequest(BaseModel):
    """Request model for image generation."""
    drink: Drink


class GenerateImageResponse(BaseModel):
    """Response model for image generation."""
    image_url: str
    drink_name: str

