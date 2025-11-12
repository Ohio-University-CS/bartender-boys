import logging
from bson import ObjectId

from fastapi import APIRouter, HTTPException

from fastapi import Query

from services.openai import OpenAIService
from data.drinks import (
    create_drink,
    get_drinks_paginated,
    get_drink_by_id as get_drink_by_id_db,
)
from .models import (
    GenerateDrinkRequest,
    GenerateDrinkResponse,
    DrinksListResponse,
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


@router.get("", response_model=DrinksListResponse)
async def get_drinks(
    skip: int = Query(0, ge=0, description="Number of drinks to skip"),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of drinks to return"
    ),
    user_id: str | None = Query(None, description="Filter drinks by user ID"),
    category: str | None = Query(None, description="Filter drinks by category"),
) -> DrinksListResponse:
    """
    Get drinks with pagination.

    Args:
        skip: Number of drinks to skip
        limit: Maximum number of drinks to return (1-100)
        user_id: Optional user ID to filter by
        category: Optional category to filter by

    Returns:
        Paginated list of drinks
    """
    try:
        drinks_docs, total = await get_drinks_paginated(
            skip=skip,
            limit=limit,
            user_id=user_id,
            category=category,
        )

        # Convert documents to Drink models
        drinks = []
        for doc in drinks_docs:
            # Skip documents that don't have required fields
            if not all(
                key in doc
                for key in [
                    "name",
                    "category",
                    "ingredients",
                    "instructions",
                    "difficulty",
                    "prepTime",
                ]
            ):
                logger.warning(
                    "Skipping drink document with missing required fields: %s",
                    doc.get("_id", "unknown"),
                )
                continue

            drink = Drink(
                id=doc.get("_id", doc.get("id", "")),
                name=doc.get("name", ""),
                category=doc.get("category", ""),
                ingredients=doc.get("ingredients", []),
                instructions=doc.get("instructions", ""),
                difficulty=doc.get("difficulty", "Easy"),
                prepTime=doc.get("prepTime", ""),
                user_id=doc.get("user_id"),
                image_url=doc.get("image_url"),
            )
            drinks.append(drink)

        has_more = (skip + limit) < total

        return DrinksListResponse(
            drinks=drinks,
            total=total,
            skip=skip,
            limit=limit,
            has_more=has_more,
        )
    except Exception as e:
        logger.exception("Failed to get drinks")
        raise HTTPException(status_code=500, detail=f"Error fetching drinks: {str(e)}")


@router.get("/{drink_id}", response_model=Drink)
async def get_drink_by_id(drink_id: str) -> Drink:
    """
    Get a drink by its ID.

    Args:
        drink_id: Drink ID

    Returns:
        Drink details
    """
    try:
        drink_doc = await get_drink_by_id_db(drink_id)

        if not drink_doc:
            raise HTTPException(status_code=404, detail="Drink not found")

        drink = Drink(
            id=drink_doc.get("_id", drink_doc.get("id", drink_id)),
            name=drink_doc["name"],
            category=drink_doc["category"],
            ingredients=drink_doc["ingredients"],
            instructions=drink_doc["instructions"],
            difficulty=drink_doc["difficulty"],
            prepTime=drink_doc["prepTime"],
            user_id=drink_doc.get("user_id"),
            image_url=drink_doc.get("image_url"),
        )

        return drink
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to get drink by ID")
        raise HTTPException(status_code=500, detail=f"Error fetching drink: {str(e)}")


@router.post("/generate-drink", response_model=GenerateDrinkResponse)
async def generate_drink(request: GenerateDrinkRequest) -> GenerateDrinkResponse:
    """
    Create a drink with the given information, generate an image, and save to MongoDB.

    Args:
        request: Drink information including name, category, ingredients, etc.

    Returns:
        The created drink with generated image URL
    """
    service = get_openai_service()
    if service is None:
        raise HTTPException(status_code=500, detail="OpenAI service not configured")

    try:
        # Generate a unique ID for the drink
        drink_id = str(ObjectId())

        # Generate image using existing logic
        logger.info("Generating image for drink: %s", request.name)
        prompt = f"A beautiful, professional cocktail photograph of a {request.name}. "
        prompt += f"Category: {request.category}. "
        prompt += "Show it in an elegant glass with proper garnishes and styling. "
        prompt += "The drink should look appetizing with good lighting, suitable for a cocktail menu. "
        prompt += "Background should be clean and elegant."

        image_url = await service.generate_image(prompt)
        logger.info("Image generated successfully: %s", image_url)

        # Create the final Drink object with the image URL
        drink = Drink(
            id=drink_id,
            name=request.name,
            category=request.category,
            ingredients=request.ingredients,
            instructions=request.instructions,
            difficulty=request.difficulty,
            prepTime=request.prepTime,
            user_id=request.user_id,
            image_url=image_url,
        )

        # Save to MongoDB
        logger.info("Saving drink to MongoDB: %s", request.name)
        saved_drink_doc = await create_drink(drink, request.user_id)

        # Convert the saved document back to a Drink model for the response
        # The document has _id, but we want to use id for consistency
        saved_drink = Drink(
            id=saved_drink_doc.get("_id", saved_drink_doc.get("id", drink_id)),
            name=saved_drink_doc["name"],
            category=saved_drink_doc["category"],
            ingredients=saved_drink_doc["ingredients"],
            instructions=saved_drink_doc["instructions"],
            difficulty=saved_drink_doc["difficulty"],
            prepTime=saved_drink_doc["prepTime"],
            user_id=saved_drink_doc.get("user_id"),
            image_url=saved_drink_doc.get("image_url"),
        )

        logger.info(
            "Drink created and saved successfully: %s (ID: %s)",
            saved_drink.name,
            saved_drink.id,
        )
        return GenerateDrinkResponse(drink=saved_drink)

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.exception("Failed to generate and save drink")
        raise HTTPException(status_code=500, detail=f"Error generating drink: {str(e)}")
