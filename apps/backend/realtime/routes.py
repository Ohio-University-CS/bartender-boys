import logging
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from settings import settings
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/realtime", tags=["Realtime"])

VALID_VOICES = [
    "alloy",
    "ash",
    "ballad",
    "coral",
    "echo",
    "sage",
    "shimmer",
    "verse",
    "marin",
    "cedar",
]


class TokenRequest(BaseModel):
    voice: str = "alloy"


@router.post("/token")
async def get_realtime_token(request: TokenRequest = TokenRequest()):
    """
    Get an ephemeral token for OpenAI Realtime API.
    This endpoint creates a session with OpenAI and returns the client_secret
    that can be used to establish a WebRTC connection.

    Args:
        request: Token request containing voice option (defaults to 'alloy')
    """
    openai_api_key = os.getenv("OPENAI_API_KEY") or settings.OPENAI_API_KEY

    if not openai_api_key:
        logger.error("OpenAI API key not configured")
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    # Validate voice option
    voice = request.voice if request.voice in VALID_VOICES else "alloy"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers={
                    "Authorization": f"Bearer {openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.OPENAI_REALTIME_MODEL,
                    "voice": voice,
                },
                timeout=30.0,
            )
            response.raise_for_status()
            session_data = response.json()

            logger.info("Successfully created OpenAI Realtime session")
            return JSONResponse(
                content=session_data,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            )
    except httpx.HTTPStatusError as e:
        logger.error(
            f"Failed to create OpenAI session: {e.response.status_code} - {e.response.text}"
        )
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Failed to create OpenAI session: {e.response.text}",
        )
    except Exception as e:
        logger.error(f"Error creating OpenAI session: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.options("/token")
async def options_token():
    """Handle CORS preflight requests"""
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    )
