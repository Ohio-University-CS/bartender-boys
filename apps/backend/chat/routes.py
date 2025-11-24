import logging
import json
import asyncio
from urllib.parse import unquote
from datetime import datetime
from typing import List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Query, Response
from fastapi.responses import StreamingResponse

from services.openai import OpenAIService
from services.db import get_db_handle
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


@router.post("/respond")
async def respond(request: ChatRequest, fastapi_request: Request, stream: bool = False):
    """
    Chat completion endpoint.
    - If the client requests `text/event-stream` (or `?stream=true`), stream partial tokens via SSE.
    - Otherwise, return a single JSON response `{ reply: string }`.
    """
    service = get_openai_service()
    if service is None:
        raise HTTPException(status_code=500, detail="OpenAI service not configured")

    accepts = fastapi_request.headers.get("accept", "").lower()
    use_stream = stream or ("text/event-stream" in accepts)

    if not use_stream:
        try:
            completion = service.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": m.role, "content": m.content} for m in request.messages
                ],
                temperature=0.3,
                max_tokens=400,
            )
            content = completion.choices[0].message.content or ""
            return ChatResponse(reply=content)
        except Exception as e:
            logger.exception("Chat generation failed")
            raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

    def sse_format(data: dict) -> str:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    def event_generator():
        try:
            stream_resp = service.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": m.role, "content": m.content} for m in request.messages
                ],
                temperature=0.3,
                max_tokens=400,
                stream=True,
            )

            for chunk in stream_resp:
                try:
                    choices = getattr(chunk, "choices", None)
                    if not choices:
                        continue
                    delta = getattr(choices[0], "delta", None)
                    if delta is None:
                        continue
                    piece = getattr(delta, "content", None)
                    if piece:
                        yield sse_format({"delta": piece})
                except Exception:
                    # Continue on malformed chunks
                    continue

            # Signal completion
            yield sse_format({"done": True})
        except Exception as e:
            logger.exception("Streaming chat generation failed")
            # Send an error event to the client, then end stream
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
    q: str = Query(..., description="URL-encoded JSON with { messages: Message[] }"),
):
    """
    SSE endpoint that accepts a URL-encoded JSON object `q` with shape:
      { "messages": [{ "role": "system"|"user"|"assistant", "content": string }, ...] }

    This is designed for EventSource (GET-only) clients, including React Native via react-native-sse.
    """
    service = get_openai_service()
    if service is None:
        raise HTTPException(status_code=500, detail="OpenAI service not configured")

    try:
        decoded = unquote(q)
        payload = json.loads(decoded)
        raw_messages = payload.get("messages", [])
        if not isinstance(raw_messages, list):
            raise ValueError("messages must be a list")
        messages = [{"role": m["role"], "content": m["content"]} for m in raw_messages]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid query payload: {str(e)}")

    def sse_format(data: dict) -> str:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    def event_generator():
        try:
            stream_resp = service.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                temperature=0.3,
                max_tokens=400,
                stream=True,
            )

            for chunk in stream_resp:
                try:
                    choices = getattr(chunk, "choices", None)
                    if not choices:
                        continue
                    delta = getattr(choices[0], "delta", None)
                    if delta is None:
                        continue
                    piece = getattr(delta, "content", None)
                    if piece:
                        yield sse_format({"delta": piece})
                except Exception:
                    continue

            yield sse_format({"done": True})
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
