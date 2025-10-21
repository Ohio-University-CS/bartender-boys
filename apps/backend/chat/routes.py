import logging
from fastapi import APIRouter, HTTPException
from typing import List

from services.openai import OpenAIService
from .models import ChatRequest, ChatResponse

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

@router.post("/respond", response_model=ChatResponse)
async def respond(request: ChatRequest) -> ChatResponse:
    service = get_openai_service()
    if service is None:
        raise HTTPException(status_code=500, detail="OpenAI service not configured")

    try:
        # Use the lower-level client for flexibility
        completion = service.client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": m.role, "content": m.content} for m in request.messages],
            temperature=0.3,
            max_tokens=400,
        )
        content = completion.choices[0].message.content or ""
        return ChatResponse(reply=content)
    except Exception as e:
        logger.exception("Chat generation failed")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")
