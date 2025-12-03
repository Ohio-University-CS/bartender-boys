import logging
import json
import asyncio
from urllib.parse import unquote
from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Query, Response
from fastapi.responses import StreamingResponse

from services.openai import OpenAIService
from services.db import get_db_handle
from data.pump_config import get_pump_config
from .models import (
    ChatRequest,
    ChatResponse,
    ConversationCreate,
    ConversationResponse,
    ChatCreate,
    ChatMessageResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])

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


def get_tools_schema() -> List[Dict[str, Any]]:
    """Get the tools schema for function calling."""
    return [
        {
            "type": "function",
            "function": {
                "name": "generate_drink",
                "description": "Generate a new drink with an AI-generated image. Use this when the user wants to create a custom drink. Extract the drink name, category, ingredients list, instructions, difficulty level (Easy, Medium, or Hard), and prep time from the conversation.",
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
                            "description": "The difficulty level of making this drink",
                        },
                        "prepTime": {
                            "type": "string",
                            "description": "The preparation time (e.g., '5 minutes', '10-15 minutes')",
                        },
                        "user_id": {
                            "type": "string",
                            "description": "The user ID who is creating this drink (optional, defaults to 'guest')",
                        },
                    },
                    "required": ["name", "category", "ingredients", "instructions", "difficulty", "prepTime"],
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
            
            # Prepare request body
            request_body = {
                "name": arguments.get("name"),
                "category": arguments.get("category"),
                "ingredients": arguments.get("ingredients", []),
                "instructions": arguments.get("instructions"),
                "difficulty": arguments.get("difficulty"),
                "prepTime": arguments.get("prepTime"),
                "user_id": drink_user_id,
            }
            
            # Call the drinks API to generate the drink
            # We need to make an internal HTTP call since we're in the same process
            # For now, we'll import and call the function directly
            from drinks.routes import generate_drink
            from drinks.models import GenerateDrinkRequest
            
            drink_request = GenerateDrinkRequest(**request_body)
            result = await generate_drink(drink_request)
            
            return {
                "success": True,
                "message": f"Successfully created drink '{result.drink.name}'! You can view it in your drinks menu.",
                "drink": {
                    "id": result.drink.id,
                    "name": result.drink.name,
                    "category": result.drink.category,
                    "image_url": result.drink.image_url,
                }
            }
        except Exception as e:
            logger.error(f"Error generating drink: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to generate drink: {str(e)}"
            }
    
    return {"success": False, "error": f"Unknown function: {function_name}"}


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
        except Exception as e:
            logger.warning(f"Failed to load pump config for system message: {str(e)}")
    
    base_message += "If a user wants to create a custom drink, use the generate_drink function to create it with an AI-generated image. "
    base_message += "Keep your responses concise and helpful."
    
    return base_message


@router.post("/respond")
async def respond(
    request: ChatRequest, 
    fastapi_request: Request, 
    stream: bool = False,
    user_id: Optional[str] = Query(None, description="User ID for pump config and drink creation")
):
    """
    Chat completion endpoint with function calling support.
    - If the client requests `text/event-stream` (or `?stream=true`), stream partial tokens via SSE.
    - Otherwise, return a single JSON response `{ reply: string }`.
    """
    service = get_openai_service()
    if service is None:
        raise HTTPException(status_code=500, detail="OpenAI service not configured")

    accepts = fastapi_request.headers.get("accept", "").lower()
    use_stream = stream or ("text/event-stream" in accepts)

    # Build messages with system message
    system_message = await build_system_message(user_id)
    messages = [{"role": "system", "content": system_message}]
    messages.extend([{"role": m.role, "content": m.content} for m in request.messages])
    
    tools = get_tools_schema()

    if not use_stream:
        try:
            # Handle function calling in non-streaming mode
            max_iterations = 5
            iteration = 0
            
            while iteration < max_iterations:
                completion = service.client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                    temperature=0.3,
                    max_tokens=400,
                )
                
                message = completion.choices[0].message
                
                # Check if there's a function call
                if message.tool_calls:
                    # Add assistant message with tool calls
                    messages.append({
                        "role": "assistant",
                        "content": message.content or "",
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": tc.type,
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments,
                                }
                            }
                            for tc in message.tool_calls
                        ]
                    })
                    
                    # Execute function calls
                    for tool_call in message.tool_calls:
                        function_name = tool_call.function.name
                        try:
                            arguments = json.loads(tool_call.function.arguments)
                        except json.JSONDecodeError:
                            arguments = {}
                        
                        result = await handle_function_call(function_name, arguments, user_id)
                        
                        # Add function result to messages
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": function_name,
                            "content": json.dumps(result),
                        })
                    
                    iteration += 1
                    continue
                
                # No function call, return the response
                content = message.content or ""
                return ChatResponse(reply=content)
            
            # If we've exhausted iterations, return the last message
            content = messages[-1].get("content", "") if messages else ""
            return ChatResponse(reply=content)
            
        except Exception as e:
            logger.exception("Chat generation failed")
            raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

    def sse_format(data: dict) -> str:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    async def event_generator():
        try:
            max_iterations = 5
            iteration = 0
            
            while iteration < max_iterations:
                stream_resp = service.client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    tools=tools,
                    tool_choice="auto",
                    temperature=0.3,
                    max_tokens=400,
                    stream=True,
                )
                
                accumulated_content = ""
                tool_calls = []
                
                for chunk in stream_resp:
                    try:
                        choices = getattr(chunk, "choices", None)
                        if not choices:
                            continue
                        delta = getattr(choices[0], "delta", None)
                        if delta is None:
                            continue
                        
                        # Handle content delta
                        piece = getattr(delta, "content", None)
                        if piece:
                            accumulated_content += piece
                            yield sse_format({"delta": piece})
                        
                        # Handle tool call deltas
                        tool_call_delta = getattr(delta, "tool_calls", None)
                        if tool_call_delta:
                            for tc_delta in tool_call_delta:
                                index = getattr(tc_delta, "index", None)
                                if index is not None:
                                    # Ensure we have enough tool calls in the list
                                    while len(tool_calls) <= index:
                                        tool_calls.append({
                                            "id": "",
                                            "type": "function",
                                            "function": {"name": "", "arguments": ""}
                                        })
                                    
                                    # Update tool call
                                    if getattr(tc_delta, "id", None):
                                        tool_calls[index]["id"] = tc_delta.id
                                    if getattr(tc_delta.function, "name", None):
                                        tool_calls[index]["function"]["name"] = tc_delta.function.name
                                    if getattr(tc_delta.function, "arguments", None):
                                        tool_calls[index]["function"]["arguments"] += tc_delta.function.arguments
                    except Exception:
                        continue
                
                # Check if we have tool calls to execute
                if tool_calls:
                    # Add assistant message with tool calls
                    messages.append({
                        "role": "assistant",
                        "content": accumulated_content or "",
                        "tool_calls": [
                            {
                                "id": tc["id"],
                                "type": tc["type"],
                                "function": {
                                    "name": tc["function"]["name"],
                                    "arguments": tc["function"]["arguments"],
                                }
                            }
                            for tc in tool_calls if tc["id"]
                        ]
                    })
                    
                    # Execute function calls
                    for tool_call in tool_calls:
                        if not tool_call["id"]:
                            continue
                        
                        function_name = tool_call["function"]["name"]
                        try:
                            arguments = json.loads(tool_call["function"]["arguments"])
                        except json.JSONDecodeError:
                            arguments = {}
                        
                        result = await handle_function_call(function_name, arguments, user_id)
                        
                        # Add function result to messages
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "name": function_name,
                            "content": json.dumps(result),
                        })
                    
                    iteration += 1
                    continue
                
                # No tool calls, we're done
                yield sse_format({"done": True})
                return
                
        except Exception as e:
            logger.exception("Streaming chat generation failed")
            yield sse_format({"error": str(e)})

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",  # for some proxies
    }

    return StreamingResponse(
        event_generator(), media_type="text/event-stream", headers=headers
    )


@router.get("/respond_stream")
async def respond_stream(
    q: str = Query(..., description="URL-encoded JSON with { messages: Message[], user_id?: string }"),
):
    """
    SSE endpoint that accepts a URL-encoded JSON object `q` with shape:
      { "messages": [{ "role": "system"|"user"|"assistant", "content": string }, ...], "user_id"?: string }

    This is designed for EventSource (GET-only) clients, including React Native via react-native-sse.
    """
    service = get_openai_service()
    if service is None:
        raise HTTPException(status_code=500, detail="OpenAI service not configured")

    try:
        decoded = unquote(q)
        payload = json.loads(decoded)
        raw_messages = payload.get("messages", [])
        user_id = payload.get("user_id")
        if not isinstance(raw_messages, list):
            raise ValueError("messages must be a list")
        messages = [{"role": m["role"], "content": m["content"]} for m in raw_messages]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid query payload: {str(e)}")

    def sse_format(data: dict) -> str:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    async def event_generator():
        try:
            # Build messages with system message (replace existing system message if present)
            system_message = await build_system_message(user_id)
            # Remove any existing system messages and add ours
            filtered_messages = [m for m in messages if m.get("role") != "system"]
            final_messages = [{"role": "system", "content": system_message}] + filtered_messages
            
            tools = get_tools_schema()
            max_iterations = 5
            iteration = 0
            
            while iteration < max_iterations:
                stream_resp = service.client.chat.completions.create(
                    model="gpt-4o",
                    messages=final_messages,
                    tools=tools,
                    tool_choice="auto",
                    temperature=0.3,
                    max_tokens=400,
                    stream=True,
                )
                
                accumulated_content = ""
                tool_calls = []
                
                for chunk in stream_resp:
                    try:
                        choices = getattr(chunk, "choices", None)
                        if not choices:
                            continue
                        delta = getattr(choices[0], "delta", None)
                        if delta is None:
                            continue
                        
                        # Handle content delta
                        piece = getattr(delta, "content", None)
                        if piece:
                            accumulated_content += piece
                            yield sse_format({"delta": piece})
                        
                        # Handle tool call deltas
                        tool_call_delta = getattr(delta, "tool_calls", None)
                        if tool_call_delta:
                            for tc_delta in tool_call_delta:
                                index = getattr(tc_delta, "index", None)
                                if index is not None:
                                    # Ensure we have enough tool calls in the list
                                    while len(tool_calls) <= index:
                                        tool_calls.append({
                                            "id": "",
                                            "type": "function",
                                            "function": {"name": "", "arguments": ""}
                                        })
                                    
                                    # Update tool call
                                    if getattr(tc_delta, "id", None):
                                        tool_calls[index]["id"] = tc_delta.id
                                    if getattr(tc_delta.function, "name", None):
                                        tool_calls[index]["function"]["name"] = tc_delta.function.name
                                    if getattr(tc_delta.function, "arguments", None):
                                        tool_calls[index]["function"]["arguments"] += tc_delta.function.arguments
                    except Exception:
                        continue
                
                # Check if we have tool calls to execute
                if tool_calls:
                    # Add assistant message with tool calls
                    final_messages.append({
                        "role": "assistant",
                        "content": accumulated_content or "",
                        "tool_calls": [
                            {
                                "id": tc["id"],
                                "type": tc["type"],
                                "function": {
                                    "name": tc["function"]["name"],
                                    "arguments": tc["function"]["arguments"],
                                }
                            }
                            for tc in tool_calls if tc["id"]
                        ]
                    })
                    
                    # Execute function calls
                    for tool_call in tool_calls:
                        if not tool_call["id"]:
                            continue
                        
                        function_name = tool_call["function"]["name"]
                        try:
                            arguments = json.loads(tool_call["function"]["arguments"])
                        except json.JSONDecodeError:
                            arguments = {}
                        
                        result = await handle_function_call(function_name, arguments, user_id)
                        
                        # Add function result to messages
                        final_messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "name": function_name,
                            "content": json.dumps(result),
                        })
                    
                    iteration += 1
                    continue
                
                # No tool calls, we're done
                yield sse_format({"done": True})
                return
                
        except Exception as e:
            logger.exception("SSE chat generation failed")
            yield sse_format({"error": str(e)})

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }

    return StreamingResponse(
        event_generator(), media_type="text/event-stream", headers=headers
    )


@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(user_id: str = Query(..., description="User ID")):
    """List all conversations for a user, ordered by most recent first."""
    db = get_db_handle()
    conversations_collection = db["conversations"]

    cursor = conversations_collection.find({"user_id": user_id}).sort("updated_at", -1)
    conversations = []
    async for doc in cursor:
        conversations.append(
            ConversationResponse(
                id=str(doc["_id"]),
                user_id=doc["user_id"],
                title=doc.get("title"),
                created_at=doc["created_at"],
                updated_at=doc["updated_at"],
            )
        )

    return conversations


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(conversation: ConversationCreate):
    """Create a new conversation for a user."""
    db = get_db_handle()
    conversations_collection = db["conversations"]

    now = datetime.utcnow()
    conversation_doc = {
        "user_id": conversation.user_id,
        "created_at": now,
        "updated_at": now,
    }

    result = await conversations_collection.insert_one(conversation_doc)
    conversation_doc["_id"] = result.inserted_id

    return ConversationResponse(
        id=str(conversation_doc["_id"]),
        user_id=conversation_doc["user_id"],
        title=conversation_doc.get("title"),
        created_at=conversation_doc["created_at"],
        updated_at=conversation_doc["updated_at"],
    )


@router.get(
    "/conversations/{conversation_id}/chats", response_model=List[ChatMessageResponse]
)
async def get_conversation_chats(conversation_id: str):
    """Get all chats for a conversation, ordered by creation time."""
    db = get_db_handle()
    chats_collection = db["chats"]

    try:
        conv_object_id = ObjectId(conversation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")

    # Verify conversation exists
    conversations_collection = db["conversations"]
    conversation = await conversations_collection.find_one({"_id": conv_object_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    cursor = chats_collection.find({"conversation_id": conversation_id}).sort(
        "created_at", 1
    )
    chats = []
    async for doc in cursor:
        chats.append(
            ChatMessageResponse(
                id=str(doc["_id"]),
                conversation_id=doc["conversation_id"],
                role=doc["role"],
                content=doc["content"],
                created_at=doc["created_at"],
            )
        )

    return chats


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


@router.post(
    "/conversations/{conversation_id}/chats", response_model=ChatMessageResponse
)
async def create_chat(conversation_id: str, chat: ChatCreate):
    """Add a chat message to a conversation."""
    db = get_db_handle()
    chats_collection = db["chats"]
    conversations_collection = db["conversations"]

    try:
        conv_object_id = ObjectId(conversation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")

    # Verify conversation exists
    conversation = await conversations_collection.find_one({"_id": conv_object_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    now = datetime.utcnow()

    # Check if this is the first user message and schedule title generation
    should_generate_title = False
    if chat.role == "user" and not conversation.get("title"):
        # Count existing user messages BEFORE inserting
        existing_user_chats = await chats_collection.count_documents(
            {"conversation_id": conversation_id, "role": "user"}
        )
        # If this is the first user message, schedule title generation
        if existing_user_chats == 0:
            should_generate_title = True

    chat_doc = {
        "conversation_id": conversation_id,
        "role": chat.role,
        "content": chat.content,
        "created_at": now,
    }

    result = await chats_collection.insert_one(chat_doc)
    chat_doc["_id"] = result.inserted_id

    # Update conversation's updated_at timestamp immediately
    await conversations_collection.update_one(
        {"_id": conv_object_id}, {"$set": {"updated_at": now}}
    )

    # Schedule title generation in background if needed (non-blocking)
    if should_generate_title:
        asyncio.create_task(
            generate_and_update_title_background(conversation_id, chat.content)
        )

    return ChatMessageResponse(
        id=str(chat_doc["_id"]),
        conversation_id=chat_doc["conversation_id"],
        role=chat_doc["role"],
        content=chat_doc["content"],
        created_at=chat_doc["created_at"],
    )


@router.delete("/conversations/{conversation_id}/chats/{chat_id}", status_code=204)
async def delete_chat(conversation_id: str, chat_id: str):
    """Delete a single chat message from a conversation."""
    db = get_db_handle()
    chats_collection = db["chats"]
    conversations_collection = db["conversations"]

    try:
        conv_object_id = ObjectId(conversation_id)
        chat_object_id = ObjectId(chat_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # Ensure conversation exists
    conversation = await conversations_collection.find_one({"_id": conv_object_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Ensure chat exists and belongs to the conversation
    chat_doc = await chats_collection.find_one(
        {"_id": chat_object_id, "conversation_id": conversation_id}
    )
    if not chat_doc:
        raise HTTPException(status_code=404, detail="Chat not found")

    await chats_collection.delete_one({"_id": chat_object_id})
    await conversations_collection.update_one(
        {"_id": conv_object_id}, {"$set": {"updated_at": datetime.utcnow()}}
    )

    return Response(status_code=204)


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: str):
    """Delete an entire conversation and its chat messages."""
    db = get_db_handle()
    conversations_collection = db["conversations"]
    chats_collection = db["chats"]

    try:
        conv_object_id = ObjectId(conversation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")

    conversation = await conversations_collection.find_one({"_id": conv_object_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Delete chats first, then the conversation record
    await chats_collection.delete_many({"conversation_id": conversation_id})
    await conversations_collection.delete_one({"_id": conv_object_id})

    return Response(status_code=204)
