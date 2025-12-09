import logging
from datetime import datetime
from typing import List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, Response

from services.db import get_db_handle
from .models import ConversationCreate, ConversationResponse

logger = logging.getLogger(__name__)

router = APIRouter()


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


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    user_id: str = Query(..., description="User ID (required)"),
):
    """Delete an entire conversation and its chat messages. Only works if the conversation belongs to the specified user."""
    
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
    
    # Verify the conversation belongs to the requesting user
    if conversation.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied: Conversation does not belong to this user")

    # Delete chats first, then the conversation record
    await chats_collection.delete_many({"conversation_id": conversation_id})
    await conversations_collection.delete_one({"_id": conv_object_id})

    return Response(status_code=204)

