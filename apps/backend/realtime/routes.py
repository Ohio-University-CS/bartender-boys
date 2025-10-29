from fastapi import WebSocket, HTTPException
from fastapi.routing import APIRouter
from fastapi.responses import FileResponse
import os
from .realtime_manager import openai_manager

# Create router for OpenAI Realtime endpoints
router = APIRouter(prefix="/openai", tags=["openai-realtime"])

@router.websocket("/realtime/{client_id}")
async def openai_realtime_websocket(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for OpenAI Realtime API connection"""
    await openai_manager.connect_client(websocket, client_id)

@router.post("/token")
async def get_openai_token():
    """Get an ephemeral session for OpenAI Realtime API"""
    try:
        session_data = await openai_manager.get_ephemeral_token()
        return {
            "session_id": session_data["session_id"],
            "expires_in": session_data["expires_in"],
            "model": session_data["model"],
            "voice": session_data["voice"],
            "instructions": session_data["instructions"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_openai_status():
    """Get current status of OpenAI Realtime connection"""
    status = openai_manager.get_status()
    
    # Add more detailed connection info
    if openai_manager.openai_websocket:
        try:
            status["websocket_state"] = str(openai_manager.openai_websocket.state)
            status["websocket_local_address"] = str(openai_manager.openai_websocket.local_address)
            status["websocket_remote_address"] = str(openai_manager.openai_websocket.remote_address)
        except Exception as e:
            status["websocket_error"] = str(e)
    
    return status

@router.post("/connect/{client_id}")
async def connect_to_openai(client_id: str):
    """Test connection to OpenAI Realtime API"""
    try:
        result = await openai_manager.connect_to_openai_realtime(client_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/client")
async def openai_client():
    """Serve the OpenAI Realtime client HTML page"""
    client_path = os.path.join(os.path.dirname(__file__), "openai_client.html")
    return FileResponse(client_path)

@router.get("/")
async def openai_client_root():
    """Serve the OpenAI Realtime client HTML page (root endpoint)"""
    client_path = os.path.join(os.path.dirname(__file__), "openai_client.html")
    return FileResponse(client_path)
