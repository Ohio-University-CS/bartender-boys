from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime

Role = Literal["system", "user", "assistant"]


class Message(BaseModel):
    role: Role
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    messages: List[Message]


class ChatResponse(BaseModel):
    reply: str


class ConversationCreate(BaseModel):
    user_id: str


class ConversationResponse(BaseModel):
    id: str
    user_id: str
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ChatCreate(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatMessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime
