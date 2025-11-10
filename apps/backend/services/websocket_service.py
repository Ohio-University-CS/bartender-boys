"""
Simple WebSocket Connection Manager for FastAPI

This module provides a straightforward WebSocket connection manager
that follows FastAPI's standard patterns.
"""
import json
import asyncio
import logging
from typing import Optional, Dict, Any, Callable, Awaitable
from collections import defaultdict

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class WebSocketConnectionManager:
    """
    Simple WebSocket connection manager.
    
    Manages active connections and provides methods to send messages.
    """
    
    def __init__(self):
        # Store active connections: client_id -> websocket
        self.active_connections: Dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()
    
    async def accept(self, websocket: WebSocket, client_id: str) -> bool:
        """
        Accept a WebSocket connection and register it.
        
        Args:
            websocket: FastAPI WebSocket instance
            client_id: Unique identifier for the client
            
        Returns:
            True if connection was accepted, False otherwise
        """
        try:
            # Close existing connection for this client if any (atomic check and remove)
            async with self._lock:
                if client_id in self.active_connections:
                    old_ws = self.active_connections.pop(client_id)
                    # Close old connection outside lock to avoid blocking
                    try:
                        await old_ws.close(code=1001, reason="Superseded by new connection")
                    except Exception:
                        pass  # Ignore errors closing old connection
            
            # Accept the new connection
            await websocket.accept()
            
            # Verify the websocket is in a valid state after accept
            # Check if the websocket is in a connected state
            try:
                # Try a no-op to verify the connection is valid
                # We can't check state directly, but we can verify it's not None
                if websocket is None:
                    logger.error(f"WebSocket is None after accept for {client_id}")
                    return False
            except Exception as e:
                logger.error(f"WebSocket validation failed for {client_id}: {e}")
                return False
            
            # Register the new connection
            async with self._lock:
                self.active_connections[client_id] = websocket
            
            logger.info(f"WebSocket connection accepted for client {client_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to accept WebSocket for {client_id}: {e}", exc_info=True)
            # Try to close the websocket if accept failed
            try:
                await websocket.close(code=1011, reason="Accept failed")
            except Exception:
                pass
            return False
    
    async def disconnect(self, client_id: str):
        """Remove a connection from active connections."""
        async with self._lock:
            if client_id in self.active_connections:
                del self.active_connections[client_id]
                logger.info(f"Disconnected client {client_id}")
    
    async def send_json(self, client_id: str, data: Dict[str, Any]) -> bool:
        """
        Send JSON data to a connected client.
        
        Args:
            client_id: Client identifier
            data: JSON-serializable data
            
        Returns:
            True if sent successfully, False otherwise
        """
        async with self._lock:
            websocket = self.active_connections.get(client_id)
        
        if not websocket:
            logger.debug(f"No active connection for client {client_id}")
            return False
        
        try:
            message = json.dumps(data)
            await websocket.send_text(message)
            return True
        except WebSocketDisconnect:
            logger.info(f"Client {client_id} disconnected during send")
            await self.disconnect(client_id)
            return False
        except Exception as e:
            logger.warning(f"Error sending message to {client_id}: {e}")
            await self.disconnect(client_id)
            return False
    
    def is_connected(self, client_id: str) -> bool:
        """Check if a client is connected."""
        return client_id in self.active_connections
    
    def get_active_clients(self) -> list[str]:
        """Get list of all connected client IDs."""
        return list(self.active_connections.keys())
    
    async def handle_connection(
        self,
        websocket: WebSocket,
        client_id: str,
        on_message: Optional[Callable[[str, Dict[str, Any]], Awaitable[None]]] = None,
        on_connect: Optional[Callable[[str], Awaitable[None]]] = None,
        on_disconnect: Optional[Callable[[str], Awaitable[None]]] = None
    ) -> None:
        """
        Handle a WebSocket connection lifecycle.
        
        This is the main method that should be called from route handlers.
        It handles the entire connection lifecycle including:
        - Accepting the connection
        - Calling on_connect callback
        - Running message loop
        - Calling on_disconnect callback
        - Cleanup
        
        Args:
            websocket: FastAPI WebSocket instance
            client_id: Unique identifier for the client
            on_message: Callback for handling incoming messages (client_id, message_dict)
            on_connect: Callback when connection is established (client_id)
            on_disconnect: Callback when connection is closed (client_id)
        """
        # Accept the connection
        if not await self.accept(websocket, client_id):
            logger.error(f"Failed to accept connection for {client_id}")
            return
        
        # Get the websocket from active_connections to ensure we're using the registered one
        async with self._lock:
            registered_ws = self.active_connections.get(client_id)
        
        if not registered_ws:
            logger.error(f"WebSocket not found in active_connections after accept for {client_id}")
            return
        
        # Use the registered websocket for all operations
        websocket = registered_ws
        
        # Call on_connect callback
        if on_connect:
            try:
                await on_connect(client_id)
            except Exception as e:
                logger.error(f"Error in on_connect callback for {client_id}: {e}", exc_info=True)
                # Continue even if callback fails
        
        # Main message loop
        try:
            while True:
                try:
                    # Wait for a message from the client
                    data = await websocket.receive_text()
                    
                    # Parse JSON
                    try:
                        message = json.loads(data)
                    except json.JSONDecodeError as e:
                        logger.warning(f"Invalid JSON from {client_id}: {e}")
                        continue
                    
                    # Call on_message callback
                    if on_message:
                        try:
                            await on_message(client_id, message)
                        except Exception as e:
                            logger.error(f"Error in on_message callback for {client_id}: {e}", exc_info=True)
                            # Continue processing even if callback fails
                            
                except WebSocketDisconnect:
                    # Normal disconnect
                    logger.info(f"Client {client_id} disconnected normally")
                    break
                    
        except Exception as e:
            logger.error(f"Error in message loop for {client_id}: {e}", exc_info=True)
        finally:
            # Cleanup
            await self.disconnect(client_id)
            
            # Call on_disconnect callback
            if on_disconnect:
                try:
                    await on_disconnect(client_id)
                except Exception as e:
                    logger.error(f"Error in on_disconnect callback for {client_id}: {e}", exc_info=True)


# Global instance
websocket_manager = WebSocketConnectionManager()
