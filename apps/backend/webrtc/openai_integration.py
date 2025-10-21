import json
import asyncio
import logging
from typing import Optional, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from fastapi.routing import APIRouter
from fastapi.responses import FileResponse
import httpx
import os
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class OpenAIRealtimeManager:
    def __init__(self):
        self.active_connection: Optional[WebSocket] = None
        self.current_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if not self.openai_api_key:
            logger.warning("OPENAI_API_KEY not found in environment variables")
    
    async def get_ephemeral_token(self) -> Dict[str, Any]:
        """Get an ephemeral token from OpenAI for Realtime API"""
        if not self.openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    "https://api.openai.com/v1/realtime/sessions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-realtime-preview-2024-10-01",
                        "voice": "alloy",
                        "instructions": "You are a helpful bartender assistant. Help customers with drink orders and ID verification."
                    }
                )
                response.raise_for_status()
                session_data = response.json()
                
                # Log the response to understand the structure
                logger.info(f"OpenAI API response: {session_data}")
                
                # Store session data - the response might have a different structure
                self.current_token = session_data.get("session_id") or session_data.get("id") or session_data.get("token")
                self.token_expires_at = datetime.now() + timedelta(seconds=60)
                
                logger.info("Successfully created OpenAI Realtime session")
                return {
                    "session_id": self.current_token,
                    "expires_in": 60,
                    "model": "gpt-4o-realtime-preview-2024-10-01",
                    "voice": "alloy",
                    "instructions": "You are a helpful bartender assistant. Help customers with drink orders and ID verification.",
                    "raw_response": session_data  # Include raw response for debugging
                }
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Failed to create OpenAI session: {e.response.status_code} - {e.response.text}")
                raise HTTPException(status_code=e.response.status_code, detail=f"Failed to create OpenAI session: {e.response.text}")
            except Exception as e:
                logger.error(f"Error creating OpenAI session: {e}")
                raise HTTPException(status_code=500, detail="Internal server error")
    
    def is_token_valid(self) -> bool:
        """Check if current token is still valid"""
        if not self.current_token or not self.token_expires_at:
            return False
        return datetime.now() < self.token_expires_at
    
    async def connect_client(self, websocket: WebSocket, client_id: str):
        """Connect a client to OpenAI Realtime API"""
        if self.active_connection:
            await websocket.close(code=1008, reason="Another client is already connected")
            return
        
        await websocket.accept()
        self.active_connection = websocket
        
        logger.info(f"Client {client_id} connected to OpenAI Realtime API")
        
        try:
            # Send connection confirmation
            await websocket.send_text(json.dumps({
                "type": "connection_established",
                "client_id": client_id,
                "message": "Connected to OpenAI Realtime API"
            }))
            
            # Handle messages from client
            while True:
                data = await websocket.receive_text()
                message = json.loads(data)
                await self.handle_client_message(message, client_id)
                
        except WebSocketDisconnect:
            logger.info(f"Client {client_id} disconnected from OpenAI Realtime API")
        except Exception as e:
            logger.error(f"Error handling client {client_id}: {e}")
        finally:
            self.active_connection = None
    
    async def handle_client_message(self, message: Dict[str, Any], client_id: str):
        """Handle messages from client"""
        message_type = message.get("type")
        
        if message_type == "get_token":
            # Client is requesting a session
            try:
                session_data = await self.get_ephemeral_token()
                await self.send_to_client({
                    "type": "token_response",
                    "session_id": session_data["session_id"],
                    "expires_in": session_data["expires_in"],
                    "model": session_data["model"],
                    "voice": session_data["voice"]
                })
            except Exception as e:
                await self.send_to_client({
                    "type": "error",
                    "message": f"Failed to get session: {str(e)}"
                })
        
        elif message_type == "webrtc_signal":
            # Client is sending WebRTC signaling data
            # In a real implementation, you'd forward this to OpenAI's servers
            # For now, we'll just acknowledge it
            await self.send_to_client({
                "type": "webrtc_signal_ack",
                "message": "WebRTC signal received"
            })
        
        elif message_type == "function_call":
            # Handle function calls from OpenAI
            function_name = message.get("function_name")
            function_args = message.get("arguments", {})
            
            # Process the function call
            result = await self.process_function_call(function_name, function_args)
            
            await self.send_to_client({
                "type": "function_call_result",
                "function_name": function_name,
                "result": result
            })
        
        else:
            logger.warning(f"Unknown message type from client {client_id}: {message_type}")
    
    async def process_function_call(self, function_name: str, arguments: Dict[str, Any]) -> Any:
        """Process function calls from OpenAI"""
        # This is where you'd implement your custom functions
        # For example, checking ID, getting menu items, etc.
        
        if function_name == "check_id":
            # Example function for ID checking
            return {"status": "id_checked", "valid": True}
        
        elif function_name == "get_menu":
            # Example function for getting menu
            return {
                "items": [
                    {"name": "Margarita", "price": 12.99},
                    {"name": "Old Fashioned", "price": 14.99}
                ]
            }
        
        elif function_name == "place_order":
            # Example function for placing orders
            item = arguments.get("item")
            quantity = arguments.get("quantity", 1)
            return {
                "order_id": f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "item": item,
                "quantity": quantity,
                "status": "placed"
            }
        
        else:
            return {"error": f"Unknown function: {function_name}"}
    
    async def send_to_client(self, message: Dict[str, Any]):
        """Send message to connected client"""
        if self.active_connection:
            try:
                await self.active_connection.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to client: {e}")
                self.active_connection = None
    
    async def connect_to_openai_realtime(self, client_id: str) -> Dict[str, Any]:
        """
        Connect to OpenAI Realtime API using WebSocket
        Note: This is a placeholder for the actual implementation
        The real OpenAI Realtime API requires direct WebSocket connection to OpenAI's servers
        """
        if not self.openai_api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        # Real implementation would connect to OpenAI's WebSocket endpoint:
        # wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01
        # With headers: {"Authorization": f"Bearer {self.openai_api_key}"}
        
        logger.info(f"Mock connection to OpenAI Realtime API for client {client_id}")
        
        return {
            "status": "connected",
            "client_id": client_id,
            "model": "gpt-4o-realtime-preview-2024-10-01",
            "note": "This is a mock connection. Real implementation requires WebSocket connection to OpenAI's servers."
        }
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status of OpenAI Realtime connection"""
        return {
            "has_active_connection": self.active_connection is not None,
            "has_valid_token": self.is_token_valid(),
            "token_expires_at": self.token_expires_at.isoformat() if self.token_expires_at else None,
            "api_key_configured": bool(self.openai_api_key)
        }

# Global OpenAI Realtime manager instance
openai_manager = OpenAIRealtimeManager()

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
    return openai_manager.get_status()

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
    import os
    client_path = os.path.join(os.path.dirname(__file__), "openai_client.html")
    return FileResponse(client_path)
