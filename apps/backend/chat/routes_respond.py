import logging
import json
import asyncio
from urllib.parse import unquote
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import StreamingResponse

from services.db import get_db_handle
from data.pump_config import get_pump_config
from .models import ChatRequest, ChatResponse
from .utils import get_openai_service, build_system_message
from .tools import get_tools_schema, handle_function_call

logger = logging.getLogger(__name__)

router = APIRouter()


def sse_format(data: dict, event: str = "message") -> str:
    """Format data as Server-Sent Events."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


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

    # Get user_id from request body first, then query parameter, then None
    effective_user_id = request.user_id or user_id

    # Build messages with system message
    system_message = await build_system_message(effective_user_id)
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
                        
                        # For generate_drink, automatically inject available_ingredients if not provided
                        if function_name == "generate_drink" and "available_ingredients" not in arguments:
                            try:
                                tool_user_id = arguments.get("user_id") or effective_user_id
                                if tool_user_id and tool_user_id != "guest":
                                    pump_config = await get_pump_config(tool_user_id)
                                    if pump_config:
                                        # Get available ingredients from pumps (max 3, snake_case)
                                        ingredients_list = []
                                        for pump_key in ["pump1", "pump2", "pump3"]:
                                            pump_value = pump_config.get(pump_key)
                                            if pump_value and len(ingredients_list) < 3:
                                                ingredients_list.append(pump_value)
                                        if ingredients_list:
                                            arguments["available_ingredients"] = ingredients_list
                            except Exception as e:
                                logger.warning(f"Failed to inject available_ingredients: {str(e)}")
                        
                        result = await handle_function_call(function_name, arguments, effective_user_id)
                        
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
                            logger.info(f"Yielding delta chunk: {repr(piece[:100])}")
                            formatted = sse_format({"delta": piece})
                            logger.debug(f"SSE formatted: {formatted[:200]}")
                            yield formatted
                            # Give event loop a chance to send the data immediately
                            await asyncio.sleep(0)
                        
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
                    except Exception as e:
                        logger.warning(f"Error processing chunk: {e}", exc_info=True)
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
                        
                        # For generate_drink, automatically inject available_ingredients if not provided
                        if function_name == "generate_drink" and "available_ingredients" not in arguments:
                            try:
                                tool_user_id = arguments.get("user_id") or effective_user_id
                                if tool_user_id and tool_user_id != "guest":
                                    pump_config = await get_pump_config(tool_user_id)
                                    if pump_config:
                                        # Get available ingredients from pumps (max 3, snake_case)
                                        ingredients_list = []
                                        for pump_key in ["pump1", "pump2", "pump3"]:
                                            pump_value = pump_config.get(pump_key)
                                            if pump_value and len(ingredients_list) < 3:
                                                ingredients_list.append(pump_value)
                                        if ingredients_list:
                                            arguments["available_ingredients"] = ingredients_list
                            except Exception as e:
                                logger.warning(f"Failed to inject available_ingredients: {str(e)}")
                        
                        # Send status indicator for generate_drink tool call
                        if function_name == "generate_drink":
                            yield sse_format({"status": "generating_drink", "message": "Generating Drink..."})
                        
                        result = await handle_function_call(function_name, arguments, effective_user_id)
                        
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
                logger.info(f"Starting stream iteration {iteration + 1}/{max_iterations}")
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
                chunk_count = 0
                
                for chunk in stream_resp:
                    chunk_count += 1
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
                            logger.info(f"Yielding delta chunk: {repr(piece[:100])}")
                            formatted = sse_format({"delta": piece})
                            logger.debug(f"SSE formatted: {formatted[:200]}")
                            yield formatted
                            # Give event loop a chance to send the data immediately
                            await asyncio.sleep(0)
                        
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
                    except Exception as e:
                        logger.warning(f"Error processing chunk: {e}", exc_info=True)
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
                        
                        # For generate_drink, automatically inject available_ingredients if not provided
                        if function_name == "generate_drink" and "available_ingredients" not in arguments:
                            try:
                                tool_user_id = arguments.get("user_id") or user_id
                                if tool_user_id and tool_user_id != "guest":
                                    pump_config = await get_pump_config(tool_user_id)
                                    if pump_config:
                                        # Get available ingredients from pumps (max 3, snake_case)
                                        ingredients_list = []
                                        for pump_key in ["pump1", "pump2", "pump3"]:
                                            pump_value = pump_config.get(pump_key)
                                            if pump_value and len(ingredients_list) < 3:
                                                ingredients_list.append(pump_value)
                                        if ingredients_list:
                                            arguments["available_ingredients"] = ingredients_list
                            except Exception as e:
                                logger.warning(f"Failed to inject available_ingredients: {str(e)}")
                        
                        # Send status indicator for generate_drink tool call
                        if function_name == "generate_drink":
                            yield sse_format({"status": "generating_drink", "message": "Generating Drink..."})
                        
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
                logger.info("Streaming complete, sending done signal")
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

