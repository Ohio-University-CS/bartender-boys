import logging
import asyncio
from datetime import datetime
from typing import List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Response, Query

from services.db import get_db_handle
from .models import ChatCreate, ChatMessageResponse
from .utils import generate_and_update_title_background

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/conversations/{conversation_id}/chats", response_model=List[ChatMessageResponse]
)
async def get_conversation_chats(
    conversation_id: str,
    user_id: str = Query(..., description="User ID (required)"),
):
    """Get all chats for a conversation, ordered by creation time. Only works if the conversation belongs to the specified user."""
    db = get_db_handle()
    chats_collection = db["chats"]

    try:
        conv_object_id = ObjectId(conversation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")

    # Verify conversation exists and belongs to the user
    conversations_collection = db["conversations"]
    conversation = await conversations_collection.find_one({"_id": conv_object_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify the conversation belongs to the requesting user
    if conversation.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied: Conversation does not belong to this user")

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


@router.post(
    "/conversations/{conversation_id}/chats", response_model=ChatMessageResponse
)
async def create_chat(
    conversation_id: str,
    chat: ChatCreate,
    user_id: str = Query(..., description="User ID (required)"),
):
    """Add a chat message to a conversation. Only works if the conversation belongs to the specified user."""
    db = get_db_handle()
    chats_collection = db["chats"]
    conversations_collection = db["conversations"]

    try:
        conv_object_id = ObjectId(conversation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")

    # Verify conversation exists and belongs to the user
    conversation = await conversations_collection.find_one({"_id": conv_object_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify the conversation belongs to the requesting user
    if conversation.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied: Conversation does not belong to this user")

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
async def delete_chat(
    conversation_id: str,
    chat_id: str,
    user_id: str = Query(..., description="User ID (required)"),
):
    """Delete a single chat message from a conversation. Only works if the conversation belongs to the specified user."""
    db = get_db_handle()
    chats_collection = db["chats"]
    conversations_collection = db["conversations"]

    try:
        conv_object_id = ObjectId(conversation_id)
        chat_object_id = ObjectId(chat_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # Ensure conversation exists and belongs to the user
    conversation = await conversations_collection.find_one({"_id": conv_object_id})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Verify the conversation belongs to the requesting user
    if conversation.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied: Conversation does not belong to this user")

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

