import json
import asyncio
import logging
from typing import Optional, Dict, Any, Union
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
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

# Import WebSocket service
from services.websocket_service import websocket_manager

logger = logging.getLogger(__name__)

class OpenAIRealtimeManager:
    def __init__(self):
        self.openai_websocket: Optional[websockets.WebSocketServerProtocol] = None
        self.listener_task: Optional[asyncio.Task] = None
        self.current_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_websocket_url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
        self.is_connected_to_openai = False
        self.openai_lock = asyncio.Lock()
        
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
    
    async def handle_client_connection(self, websocket: WebSocket, client_id: str):
        """
        Handle a client WebSocket connection using the WebSocket service.
        This method manages the entire connection lifecycle.
        """
        async def on_connect(connected_client_id: str):
            """Callback when client connects"""
            logger.info(f"Client {connected_client_id} connected to OpenAI Realtime API")
            
            # Try to connect to OpenAI Realtime API - don't fail the connection if this fails
            openai_connected = False
            try:
                await self.connect_to_openai_realtime(connected_client_id)
                openai_connected = self.is_connected_to_openai
                logger.info(f"OpenAI connection status for {connected_client_id}: {openai_connected}")
            except HTTPException as e:
                logger.error(f"Failed to connect to OpenAI for {connected_client_id}: {e.detail}")
                openai_connected = False
            except Exception as e:
                logger.error(f"Unexpected error connecting to OpenAI for {connected_client_id}: {e}", exc_info=True)
                openai_connected = False
            
            # Send connection confirmation regardless of OpenAI connection status
            try:
                connection_msg = ConnectionEstablished(
                    client_id=connected_client_id,
                    message="Connected to OpenAI Realtime API" if openai_connected else "Connected, but OpenAI connection failed",
                    openai_connected=openai_connected
                )
                success = await websocket_manager.send_json(connected_client_id, connection_msg.model_dump())
                if success:
                    logger.info(f"Sent connection confirmation to {connected_client_id}")
                else:
                    logger.warning(f"Failed to send connection confirmation to {connected_client_id}")
            except Exception as e:
                logger.error(f"Exception sending connection confirmation to {connected_client_id}: {e}", exc_info=True)
        
        async def on_message(connected_client_id: str, message: Dict[str, Any]):
            """Callback when client sends a message"""
            await self.handle_client_message(message, connected_client_id)
        
        async def on_disconnect(connected_client_id: str):
            """Callback when client disconnects"""
            logger.info(f"Client {connected_client_id} disconnected from OpenAI Realtime API")
            # Only disconnect from OpenAI if there are no more active clients
            active_clients = websocket_manager.get_active_clients()
            if not active_clients:
                await self.disconnect_from_openai()
        
        # Use the WebSocket service to handle the connection lifecycle
        await websocket_manager.handle_connection(
            websocket=websocket,
            client_id=client_id,
            on_message=on_message,
            on_connect=on_connect,
            on_disconnect=on_disconnect
        )
    
    async def handle_client_message(self, message: Dict[str, Any], client_id: str):
        """Handle messages from client using typed models"""
        try:
            # Parse the message using our models
            parsed_message = self._parse_message(message)
            await self._handle_parsed_message(parsed_message, client_id)
        except Exception as e:
            logger.error(f"Error handling client message: {e}")
            await self.send_error_to_client(f"Failed to process message: {str(e)}", client_id=client_id)
    
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
            await self._handle_get_token(client_id)
        elif message_type == "conversation.item.create":
            await self.send_message_to_openai(message.model_dump())
        elif message_type == "response.create":
            await self.send_message_to_openai(message.model_dump())
        elif message_type == "function_call":
            await self._handle_function_call(message, client_id)
        else:
            # Forward other messages to OpenAI
            logger.info(f"Forwarding message to OpenAI: {message_type}")
            if isinstance(message, dict):
                await self.send_message_to_openai(message)
            else:
                await self.send_message_to_openai(message.model_dump())
    
    async def _handle_get_token(self, client_id: str):
        """Handle get token request"""
        try:
            session_data = await self.get_ephemeral_token()
            token_response = TokenResponse(
                session_id=session_data["session_id"],
                expires_in=session_data["expires_in"],
                model=session_data["model"],
                voice=session_data["voice"]
            )
            await websocket_manager.send_json(client_id, token_response.model_dump())
        except Exception as e:
            await self.send_error_to_client(f"Failed to get session: {str(e)}", client_id=client_id)
    
    async def _handle_function_call(self, message, client_id: str):
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
        await websocket_manager.send_json(client_id, function_result)
    
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
    
    async def send_to_client(self, message: Union[Dict[str, Any], BaseModel], client_id: Optional[str] = None):
        """
        Send message to connected client(s).
        
        Args:
            message: Message to send (dict or BaseModel)
            client_id: Optional specific client ID. If None, sends to all active clients.
        """
        if isinstance(message, BaseModel):
            message_dict = message.model_dump()
        else:
            message_dict = message
        
        if client_id:
            # Send to specific client
            await websocket_manager.send_json(client_id, message_dict)
        else:
            # Send to all active clients
            active_clients = websocket_manager.get_active_clients()
            if not active_clients:
                logger.warning("No active clients to send message to")
                return
            
            for cid in active_clients:
                await websocket_manager.send_json(cid, message_dict)
    
    async def send_error_to_client(self, error_message: str, client_id: Optional[str] = None):
        """Send error message to client(s)"""
        error = ErrorMessage(
            event_id=f"error_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            error=ErrorDetail(
                type="client_error",
                code="processing_error",
                message=error_message
            )
        )
        await self.send_to_client(error, client_id=client_id)
    
    async def connect_to_openai_realtime(self, client_id: str) -> Dict[str, Any]:
        """
        Connect to OpenAI Realtime API using WebSocket.
        Only one OpenAI connection is maintained at a time.
        """
        async with self.openai_lock:
            # If already connected, reuse the connection
            if self.is_connected_to_openai and self.openai_websocket:
                logger.info(f"Reusing existing OpenAI connection for client {client_id}")
                return {
                    "status": "connected",
                    "client_id": client_id,
                    "model": "gpt-4o-realtime-preview-2024-10-01",
                    "openai_connected": True
                }
            
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
                
                # Create WebSocket connection to OpenAI
                # websockets>=15 renamed parameter to additional_headers
                header_items = [(k, v) for k, v in headers.items()]
                self.openai_websocket = await websockets.connect(
                    self.openai_websocket_url,
                    additional_headers=header_items,
                    ping_interval=20,
                    ping_timeout=10
                )
                
                self.is_connected_to_openai = True
                logger.info(f"Successfully connected to OpenAI Realtime API for client {client_id}")
                
                # Start listening for messages from OpenAI (single listener guard)
                if self.listener_task and not self.listener_task.done():
                    try:
                        self.listener_task.cancel()
                    except Exception:
                        pass
                self.listener_task = asyncio.create_task(self.listen_to_openai_messages())
                
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
                        # Send session info to all connected clients
                        session_notification = SessionCreatedNotification(
                            session_id=data["session"]["id"],
                            model=data["session"]["model"],
                            voice=data["session"]["voice"]
                        )
                        await self.send_to_client(session_notification)
                    
                    # Forward all messages to all connected clients
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
        # Use the same safe sending method
        await self.send_to_client(message)
    
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
        if self.listener_task and not self.listener_task.done():
            try:
                self.listener_task.cancel()
            except Exception:
                pass
        self.listener_task = None
    
    def get_status(self) -> Dict[str, Any]:
        """Get current status of OpenAI Realtime connection"""
        active_clients = websocket_manager.get_active_clients()
        return {
            "active_clients": active_clients,
            "active_client_count": len(active_clients),
            "has_valid_token": self.is_token_valid(),
            "token_expires_at": self.token_expires_at.isoformat() if self.token_expires_at else None,
            "api_key_configured": bool(self.openai_api_key),
            "openai_connected": self.is_connected_to_openai,
            "openai_websocket_url": self.openai_websocket_url
        }

# Global OpenAI Realtime manager instance
openai_manager = OpenAIRealtimeManager()
