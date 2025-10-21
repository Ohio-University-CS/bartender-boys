import json
import asyncio
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter
from fastapi.responses import FileResponse
import logging

logger = logging.getLogger(__name__)

class WebRTCSignalingServer:
    def __init__(self):
        # Store active connections by room
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # Store peer information
        self.peers: Dict[str, Dict] = {}
        
    async def connect(self, websocket: WebSocket, room_id: str, peer_id: str):
        """Connect a peer to a room"""
        await websocket.accept()
        
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        
        self.rooms[room_id].add(websocket)
        self.peers[peer_id] = {
            "websocket": websocket,
            "room_id": room_id,
            "peer_id": peer_id
        }
        
        logger.info(f"Peer {peer_id} connected to room {room_id}")
        
        # Notify other peers in the room about the new connection
        await self.broadcast_to_room(room_id, {
            "type": "peer_joined",
            "peer_id": peer_id
        }, exclude_peer=peer_id)
        
        # Send list of existing peers to the new peer
        existing_peers = [pid for pid, peer_info in self.peers.items() 
                         if peer_info["room_id"] == room_id and pid != peer_id]
        if existing_peers:
            await websocket.send_text(json.dumps({
                "type": "existing_peers",
                "peers": existing_peers
            }))
    
    async def disconnect(self, peer_id: str):
        """Disconnect a peer"""
        if peer_id not in self.peers:
            return
            
        peer_info = self.peers[peer_id]
        room_id = peer_info["room_id"]
        websocket = peer_info["websocket"]
        
        # Remove from room
        if room_id in self.rooms:
            self.rooms[room_id].discard(websocket)
            if not self.rooms[room_id]:
                del self.rooms[room_id]
        
        # Remove peer info
        del self.peers[peer_id]
        
        logger.info(f"Peer {peer_id} disconnected from room {room_id}")
        
        # Notify other peers in the room
        await self.broadcast_to_room(room_id, {
            "type": "peer_left",
            "peer_id": peer_id
        })
    
    async def handle_message(self, peer_id: str, message: dict):
        """Handle signaling messages between peers"""
        if peer_id not in self.peers:
            return
            
        peer_info = self.peers[peer_id]
        room_id = peer_info["room_id"]
        
        message_type = message.get("type")
        
        if message_type == "offer":
            # Forward offer to target peer
            target_peer_id = message.get("target_peer_id")
            if target_peer_id and target_peer_id in self.peers:
                await self.send_to_peer(target_peer_id, {
                    "type": "offer",
                    "offer": message.get("offer"),
                    "from_peer_id": peer_id
                })
        
        elif message_type == "answer":
            # Forward answer to target peer
            target_peer_id = message.get("target_peer_id")
            if target_peer_id and target_peer_id in self.peers:
                await self.send_to_peer(target_peer_id, {
                    "type": "answer",
                    "answer": message.get("answer"),
                    "from_peer_id": peer_id
                })
        
        elif message_type == "ice_candidate":
            # Forward ICE candidate to target peer
            target_peer_id = message.get("target_peer_id")
            if target_peer_id and target_peer_id in self.peers:
                await self.send_to_peer(target_peer_id, {
                    "type": "ice_candidate",
                    "candidate": message.get("candidate"),
                    "from_peer_id": peer_id
                })
    
    async def send_to_peer(self, peer_id: str, message: dict):
        """Send message to specific peer"""
        if peer_id in self.peers:
            websocket = self.peers[peer_id]["websocket"]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to peer {peer_id}: {e}")
                await self.disconnect(peer_id)
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude_peer: Optional[str] = None):
        """Broadcast message to all peers in a room"""
        if room_id not in self.rooms:
            return
            
        for websocket in self.rooms[room_id].copy():
            try:
                # Skip excluded peer
                if exclude_peer:
                    peer_id = None
                    for pid, peer_info in self.peers.items():
                        if peer_info["websocket"] == websocket:
                            peer_id = pid
                            break
                    if peer_id == exclude_peer:
                        continue
                
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to room {room_id}: {e}")
                # Remove disconnected websocket
                self.rooms[room_id].discard(websocket)

# Global signaling server instance
signaling_server = WebRTCSignalingServer()

# Create router for WebRTC endpoints
router = APIRouter(prefix="/webrtc", tags=["webrtc"])

@router.websocket("/signaling/{room_id}/{peer_id}")
async def websocket_signaling(websocket: WebSocket, room_id: str, peer_id: str):
    """WebSocket endpoint for WebRTC signaling"""
    await signaling_server.connect(websocket, room_id, peer_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle the signaling message
            await signaling_server.handle_message(peer_id, message)
            
    except WebSocketDisconnect:
        await signaling_server.disconnect(peer_id)
    except Exception as e:
        logger.error(f"WebSocket error for peer {peer_id}: {e}")
        await signaling_server.disconnect(peer_id)

@router.get("/rooms")
async def list_rooms():
    """List all active rooms"""
    return {
        "rooms": list(signaling_server.rooms.keys()),
        "total_rooms": len(signaling_server.rooms)
    }

@router.get("/rooms/{room_id}/peers")
async def list_room_peers(room_id: str):
    """List peers in a specific room"""
    if room_id not in signaling_server.rooms:
        return {"peers": [], "total_peers": 0}
    
    peers_in_room = [
        peer_id for peer_id, peer_info in signaling_server.peers.items()
        if peer_info["room_id"] == room_id
    ]
    
    return {
        "peers": peers_in_room,
        "total_peers": len(peers_in_room)
    }

@router.get("/client")
async def webrtc_client():
    """Serve the WebRTC client HTML page"""
    import os
    client_path = os.path.join(os.path.dirname(__file__), "client_example.html")
    return FileResponse(client_path)
