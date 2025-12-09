import logging
from typing import Optional
from bson import ObjectId

from services.openai import OpenAIService
from services.db import get_db_handle
from data.pump_config import get_pump_config

logger = logging.getLogger(__name__)

# Global OpenAI service instance
openai_service: OpenAIService | None = None


def get_openai_service() -> OpenAIService | None:
    """Get or create the OpenAI service instance."""
    global openai_service
    if openai_service is None:
        try:
            openai_service = OpenAIService()
        except ValueError as e:
            logger.error(f"Failed to initialize OpenAI service: {str(e)}")
            openai_service = None
    return openai_service


async def build_system_message(user_id: Optional[str] = None) -> str:
    """Build system message with pump configuration if available."""
    base_message = "You are a helpful bartender assistant. Help customers with drink orders and provide friendly service. "
    
    if user_id:
        try:
            pump_config = await get_pump_config(user_id)
            if pump_config:
                available_ingredients = []
                for pump_key in ["pump1", "pump2", "pump3"]:
                    pump_value = pump_config.get(pump_key)
                    if pump_value:
                        available_ingredients.append(pump_value)
                
                if available_ingredients:
                    ingredients_list = ", ".join(available_ingredients)
                    base_message += f"The user has the following ingredients available in their pumps: {ingredients_list}. "
                    base_message += "Only suggest or generate drinks that can be made with these ingredients. "
                    base_message += "If a user requests a drink with unavailable ingredients, politely suggest alternatives using only the available ingredients. "
                    base_message += "When a user asks you to generate or create a drink, you MUST automatically use the generate_drink function with the available_ingredients parameter set to these ingredients. Do NOT ask the user what ingredients they have - you already know from their pump configuration. "
                    base_message += "When using the generate_drink function, you MUST include the available_ingredients parameter with these ingredients. "
        except Exception as e:
            logger.warning(f"Failed to load pump config for system message: {str(e)}")
    
    base_message += "If a user wants to create a custom drink, use the generate_drink function to create it with an AI-generated image. "
    base_message += "After successfully generating a drink using the generate_drink function, you MUST display the drink details to the user. Include: the drink name, list of ingredients, and step-by-step instructions. Format it clearly and concisely. "
    base_message += "Keep your responses concise and helpful."
    
    return base_message


async def generate_conversation_title(first_message: str) -> str:
    """Generate a short title for a conversation based on the first user message."""
    service = get_openai_service()
    if service is None:
        # Fallback: use first few words of the message
        words = first_message.split()[:5]
        return " ".join(words) + ("..." if len(first_message.split()) > 5 else "")

    try:
        completion = service.client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Generate a short, concise title (3-6 words) for a conversation based on the first message. Return only the title, no quotes or extra text.",
                },
                {"role": "user", "content": f"First message: {first_message}"},
            ],
            temperature=0.7,
            max_tokens=20,
        )
        title = completion.choices[0].message.content or ""
        # Clean up the title - remove quotes and extra whitespace
        title = title.strip().strip('"').strip("'").strip()
        # Limit to 50 characters
        if len(title) > 50:
            title = title[:47] + "..."
        return title if title else first_message[:50]
    except Exception as e:
        logger.warning(f"Failed to generate conversation title: {str(e)}")
        # Fallback: use first few words of the message
        words = first_message.split()[:5]
        return " ".join(words) + ("..." if len(first_message.split()) > 5 else "")


async def generate_and_update_title_background(
    conversation_id: str, first_message: str
):
    """Background task to generate conversation title and update the database."""
    try:
        db = get_db_handle()
        conversations_collection = db["conversations"]

        # Generate title
        title = await generate_conversation_title(first_message)

        # Update conversation with the generated title
        try:
            conv_object_id = ObjectId(conversation_id)
            await conversations_collection.update_one(
                {"_id": conv_object_id}, {"$set": {"title": title}}
            )
            logger.info(
                f"Generated and updated title for conversation {conversation_id}: {title}"
            )
        except Exception as e:
            logger.error(f"Failed to update conversation title: {str(e)}")
    except Exception as e:
        logger.error(f"Background title generation failed: {str(e)}")

