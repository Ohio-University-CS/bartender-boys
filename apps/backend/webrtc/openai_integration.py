import json
import asyncio
import logging
from typing import Optional, Dict, Any, Union
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from fastapi.routing import APIRouter
from fastapi.responses import FileResponse
import httpx
import websockets
import os
from datetime import datetime, timedelta
from pydantic import BaseModel

# Import our models
from .models import (
    OpenAIMessage, ConversationItemCreate, ResponseCreate, 
    create_function_call,
    TokenResponse, ConnectionEstablished, SessionCreatedNotification,
    ErrorMessage, ErrorDetail
)

logger = logging.getLogger(__name__)

class OpenAIRealtimeManager:
    def __init__(self):
        self.active_connection: Optional[WebSocket] = None
        self.openai_websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.current_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_websocket_url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
        self.is_connected_to_openai = False
        
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
                        "instructions": "You are a helpful bartender assistant. Help customers with drink orders."
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
            # Connect to OpenAI Realtime API
            await self.connect_to_openai_realtime(client_id)
            
            # Send connection confirmation using typed model
            connection_msg = ConnectionEstablished(
                client_id=client_id,
                message="Connected to OpenAI Realtime API",
                openai_connected=self.is_connected_to_openai
            )
            await self.send_to_client(connection_msg)
            
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
            # Disconnect from OpenAI when client disconnects
            await self.disconnect_from_openai()
            self.active_connection = None
    
    async def handle_client_message(self, message: Dict[str, Any], client_id: str):
        """Handle messages from client using typed models"""
        try:
            # Parse the message using our models
            parsed_message = self._parse_message(message)
            await self._handle_parsed_message(parsed_message, client_id)
        except Exception as e:
            logger.error(f"Error handling client message: {e}")
            await self.send_error_to_client(f"Failed to process message: {str(e)}")
    
    def _parse_message(self, message: Dict[str, Any]) -> OpenAIMessage:
        """Parse a raw message into a typed model"""
        message_type = message.get("type")
        
        # Handle different message types
        if message_type == "get_token":
            return {"type": "get_token"}
        elif message_type == "conversation.item.create":
            return ConversationItemCreate(**message)
        elif message_type == "response.create":
            return ResponseCreate(**message)
        elif message_type == "function_call":
            return create_function_call(
                message.get("function_name", ""),
                message.get("arguments", {})
            )
        else:
            # For unknown types, return as dict
            return message
    
    async def _handle_parsed_message(self, message: OpenAIMessage, client_id: str):
        """Handle parsed message based on type"""
        if isinstance(message, dict):
            message_type = message.get("type")
        else:
            message_type = message.type
        
        if message_type == "get_token":
            await self._handle_get_token()
        elif message_type == "conversation.item.create":
            await self.send_message_to_openai(message.dict())
        elif message_type == "response.create":
            await self.send_message_to_openai(message.dict())
        elif message_type == "function_call":
            await self._handle_function_call(message)
        else:
            # Forward other messages to OpenAI
            logger.info(f"Forwarding message to OpenAI: {message_type}")
            if isinstance(message, dict):
                await self.send_message_to_openai(message)
            else:
                await self.send_message_to_openai(message.dict())
    
    async def _handle_get_token(self):
        """Handle get token request"""
        try:
            session_data = await self.get_ephemeral_token()
            token_response = TokenResponse(
                session_id=session_data["session_id"],
                expires_in=session_data["expires_in"],
                model=session_data["model"],
                voice=session_data["voice"]
            )
            await self.send_to_client(token_response.dict())
        except Exception as e:
            await self.send_error_to_client(f"Failed to get session: {str(e)}")
    
    async def _handle_function_call(self, message):
        """Handle function call"""
        function_name = message.function_name
        function_args = message.arguments
        
        # Process the function call
        result = await self.process_function_call(function_name, function_args)
        
        function_result = {
            "type": "function_call_result",
            "function_name": function_name,
            "result": result
        }
        await self.send_to_client(function_result)
    
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
    
    async def send_to_client(self, message: Union[Dict[str, Any], BaseModel]):
        """Send message to connected client"""
        if self.active_connection:
            try:
                if isinstance(message, BaseModel):
                    message_dict = message.dict()
                else:
                    message_dict = message
                await self.active_connection.send_text(json.dumps(message_dict))
            except Exception as e:
                logger.error(f"Error sending message to client: {e}")
                self.active_connection = None
    
    async def send_error_to_client(self, error_message: str):
        """Send error message to client"""
        error = ErrorMessage(
            event_id=f"error_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            error=ErrorDetail(
                type="client_error",
                code="processing_error",
                message=error_message
            )
        )
        await self.send_to_client(error)
    
    async def connect_to_openai_realtime(self, client_id: str) -> Dict[str, Any]:
        """
        Connect to OpenAI Realtime API using WebSocket
        """
        if not self.openai_api_key:
            logger.error("OpenAI API key not configured")
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        try:
            # Connect to OpenAI's WebSocket endpoint
            headers = {
                "Authorization": f"Bearer {self.openai_api_key}",
                "OpenAI-Beta": "realtime=v1"
            }
            
            logger.info(f"Connecting to OpenAI Realtime API for client {client_id}")
            logger.info(f"WebSocket URL: {self.openai_websocket_url}")
            logger.info(f"Headers: {headers}")
            
            # Create WebSocket connection to OpenAI
            self.openai_websocket = await websockets.connect(
                self.openai_websocket_url,
                extra_headers=headers,
                ping_interval=20,
                ping_timeout=10
            )
            
            self.is_connected_to_openai = True
            logger.info(f"Successfully connected to OpenAI Realtime API for client {client_id}")
            
            # Start listening for messages from OpenAI
            asyncio.create_task(self.listen_to_openai_messages())
            
            return {
                "status": "connected",
                "client_id": client_id,
                "model": "gpt-4o-realtime-preview-2024-10-01",
                "openai_connected": True
            }
            
        except Exception as e:
            logger.error(f"Failed to connect to OpenAI Realtime API: {e}")
            logger.error(f"Error type: {type(e)}")
            self.is_connected_to_openai = False
            raise HTTPException(status_code=500, detail=f"Failed to connect to OpenAI: {str(e)}")
    
    async def listen_to_openai_messages(self):
        """Listen for messages from OpenAI WebSocket"""
        logger.info("Starting to listen for OpenAI messages...")
        try:
            async for message in self.openai_websocket:
                try:
                    logger.info(f"Raw message from OpenAI: {message}")
                    data = json.loads(message)
                    logger.info(f"Parsed message from OpenAI: {data}")
                    
                    # Handle session creation
                    if data.get("type") == "session.created":
                        logger.info("OpenAI session created successfully!")
                        # Send session info to client using typed model
                        session_notification = SessionCreatedNotification(
                            session_id=data["session"]["id"],
                            model=data["session"]["model"],
                            voice=data["session"]["voice"]
                        )
                        await self.send_to_client(session_notification)
                    
                    # Forward all messages to connected client
                    await self.forward_openai_message_to_client(data)
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse OpenAI message: {e}")
                    logger.error(f"Raw message: {message}")
                except Exception as e:
                    logger.error(f"Error processing OpenAI message: {e}")
                    
        except websockets.exceptions.ConnectionClosed as e:
            logger.info(f"OpenAI WebSocket connection closed: {e}")
            self.is_connected_to_openai = False
        except Exception as e:
            logger.error(f"Error listening to OpenAI messages: {e}")
            logger.error(f"Error type: {type(e)}")
            self.is_connected_to_openai = False
    
    async def forward_openai_message_to_client(self, message: Dict[str, Any]):
        """Forward OpenAI message to connected client"""
        if self.active_connection:
            try:
                await self.active_connection.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error forwarding message to client: {e}")
                self.active_connection = None
    
    async def send_message_to_openai(self, message: Dict[str, Any]):
        """Send message to OpenAI WebSocket"""
        if self.openai_websocket and self.is_connected_to_openai:
            try:
                message_json = json.dumps(message)
                await self.openai_websocket.send(message_json)
                logger.info(f"Sent message to OpenAI: {message}")
                logger.info(f"Message JSON: {message_json}")
            except Exception as e:
                logger.error(f"Error sending message to OpenAI: {e}")
                logger.error(f"WebSocket state: {self.openai_websocket.state if self.openai_websocket else 'None'}")
                self.is_connected_to_openai = False
        else:
            logger.warning(f"Not connected to OpenAI WebSocket. Connected: {self.is_connected_to_openai}, WebSocket: {self.openai_websocket is not None}")
    
    async def disconnect_from_openai(self):
        """Disconnect from OpenAI WebSocket"""
        if self.openai_websocket:
            try:
                await self.openai_websocket.close()
                logger.info("Disconnected from OpenAI WebSocket")
            except Exception as e:
                logger.error(f"Error disconnecting from OpenAI: {e}")
            finally:
                self.openai_websocket = None
                self.is_connected_to_openai = False
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status of OpenAI Realtime connection"""
        return {
            "has_active_connection": self.active_connection is not None,
            "has_valid_token": self.is_token_valid(),
            "token_expires_at": self.token_expires_at.isoformat() if self.token_expires_at else None,
            "api_key_configured": bool(self.openai_api_key),
            "openai_connected": self.is_connected_to_openai,
            "openai_websocket_url": self.openai_websocket_url
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
    import os
    client_path = os.path.join(os.path.dirname(__file__), "openai_client.html")
    return FileResponse(client_path)
