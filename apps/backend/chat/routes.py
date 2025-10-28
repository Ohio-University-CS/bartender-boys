import logging
import json
from urllib.parse import unquote
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
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
                messages=[{"role": m.role, "content": m.content} for m in request.messages],
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
                messages=[{"role": m.role, "content": m.content} for m in request.messages],
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

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)


@router.get("/respond_stream")
async def respond_stream(q: str = Query(..., description="URL-encoded JSON with { messages: Message[] }")):
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

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)
