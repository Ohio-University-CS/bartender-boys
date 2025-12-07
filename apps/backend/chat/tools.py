import logging
from typing import List, Optional, Dict, Any

from data.pump_config import get_pump_config
from drinks.routes import generate_drink
from drinks.models import GenerateDrinkRequest

logger = logging.getLogger(__name__)


def get_tools_schema() -> List[Dict[str, Any]]:
    """Get the tools schema for function calling."""
    return [
        {
            "type": "function",
            "function": {
                "name": "generate_drink",
                "description": "Generate a new drink with an AI-generated image. Use this when the user wants to create a custom drink. You should determine the drink name, category, ingredients list, instructions, difficulty level (Easy, Medium, or Hard), prep time, and ingredient ratios based on the user's request and typical cocktail knowledge.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "The name of the drink",
                        },
                        "category": {
                            "type": "string",
                            "description": "The category of the drink (e.g., Cocktail, Mocktail, Shot, etc.)",
                        },
                        "ingredients": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of ingredients needed for the drink",
                        },
                        "instructions": {
                            "type": "string",
                            "description": "Step-by-step instructions for making the drink",
                        },
                        "difficulty": {
                            "type": "string",
                            "enum": ["Easy", "Medium", "Hard"],
                            "description": "REQUIRED: The difficulty level of making this drink. Determine this based on the complexity of ingredients and instructions. Easy: simple drinks with few ingredients and basic mixing. Medium: drinks requiring some technique or multiple steps. Hard: complex drinks with advanced techniques, multiple steps, or specialized equipment.",
                        },
                        "prepTime": {
                            "type": "string",
                            "description": "REQUIRED: The preparation time estimate (e.g., '5 minutes', '10-15 minutes'). Determine this based on the complexity and number of steps required.",
                        },
                        "ratios": {
                            "type": "array",
                            "items": {"type": "integer"},
                            "description": "REQUIRED: Percentage ratios for each ingredient that must sum to exactly 100. Each ratio corresponds to the ingredient at the same index. Generate realistic ratios based on typical cocktail proportions (e.g., base spirits 30-50%, mixers 20-40%, juices 10-20%, bitters/garnishes 1-5%). All values must be integers and the sum must equal 100.",
                        },
                        "user_id": {
                            "type": "string",
                            "description": "The user ID who is creating this drink (optional, defaults to 'guest')",
                        },
                        "available_ingredients": {
                            "type": "array",
                            "items": {"type": "string"},
                            "maxItems": 3,
                            "description": "List of available ingredients in the user's configured pumps (max 3). These are in snake_case format (e.g., 'water', 'sprite', 'rc_cola'). You MUST only use ingredients from this list when creating the drink. If this is not provided, you can use any ingredients.",
                        },
                    },
                    "required": ["name", "category", "ingredients", "instructions", "difficulty", "prepTime", "ratios"],
                },
            },
        }
    ]


async def handle_function_call(function_name: str, arguments: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    """Handle function calls from the chat API."""
    if function_name == "generate_drink":
        try:
            # Use provided user_id or default to guest
            drink_user_id = arguments.get("user_id") or user_id or "guest"
            
            # Fetch pump config and get available ingredients if user_id is provided
            available_ingredients = arguments.get("available_ingredients", [])
            if not available_ingredients and drink_user_id and drink_user_id != "guest":
                try:
                    pump_config = await get_pump_config(drink_user_id)
                    if pump_config:
                        # Get available ingredients from pumps (max 3, snake_case)
                        ingredients_list = []
                        for pump_key in ["pump1", "pump2", "pump3"]:
                            pump_value = pump_config.get(pump_key)
                            if pump_value and len(ingredients_list) < 3:
                                ingredients_list.append(pump_value)
                        available_ingredients = ingredients_list
                except Exception as e:
                    logger.warning(f"Failed to fetch pump config for available ingredients: {str(e)}")
                    # Continue without available ingredients
            
            # Prepare request body
            request_body = {
                "name": arguments.get("name"),
                "category": arguments.get("category"),
                "ingredients": arguments.get("ingredients", []),
                "ratios": arguments.get("ratios"),  # Optional - will be auto-generated if not provided
                "instructions": arguments.get("instructions"),
                "difficulty": arguments.get("difficulty"),
                "prepTime": arguments.get("prepTime"),
                "user_id": drink_user_id,
            }
            
            drink_request = GenerateDrinkRequest(**request_body)
            result = await generate_drink(drink_request)
            
            return {
                "success": True,
                "message": f"Successfully created drink '{result.drink.name}'! You can view it in your drinks menu.",
                "drink": {
                    "id": result.drink.id,
                    "name": result.drink.name,
                    "category": result.drink.category,
                    "ingredients": result.drink.ingredients,
                    "instructions": result.drink.instructions,
                }
            }
        except Exception as e:
            logger.error(f"Error generating drink: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to generate drink: {str(e)}"
            }
    
    return {"success": False, "error": f"Unknown function: {function_name}"}

