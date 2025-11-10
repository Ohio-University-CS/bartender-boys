import logging

from fastapi import APIRouter, HTTPException

from services.openai import OpenAIService
from .models import (
    GenerateImageRequest,
    GenerateImageResponse,
    Drink,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/drinks", tags=["Drinks"])

openai_service: OpenAIService | None = None


def get_openai_service() -> OpenAIService | None:
    global openai_service
    if openai_service is None:
        try:
            openai_service = OpenAIService()
        except ValueError as e:
            logger.error(f"Failed to initialize OpenAI service: {str(e)}")
            openai_service = None
    return openai_service


@router.post("/generate-image", response_model=GenerateImageResponse)
async def generate_image(request: GenerateImageRequest) -> GenerateImageResponse:
    """
    Generate an image for a drink using DALL-E.
    
    Args:
        request: Drink information to generate image for
        
    Returns:
        URL of the generated image
    """
    service = get_openai_service()
    if service is None:
        raise HTTPException(status_code=500, detail="OpenAI service not configured")

    try:
        drink = request.drink
        
        # Create a detailed prompt for the image generation
        prompt = f"A beautiful, professional cocktail photograph of a {drink.name}. "
        prompt += f"Category: {drink.category}. "
        prompt += f"Show it in an elegant glass with proper garnishes and styling. "
        prompt += f"The drink should look appetizing with good lighting, suitable for a cocktail menu. "
        prompt += f"Background should be clean and elegant."
        
        # Generate image using DALL-E
        image_url = await service.generate_image(prompt)

        return GenerateImageResponse(
            image_url=image_url,
            drink_name=drink.name
        )
        
    except Exception as e:
        logger.exception("Drink image generation failed")
        raise HTTPException(status_code=500, detail=f"Image generation error: {str(e)}")

