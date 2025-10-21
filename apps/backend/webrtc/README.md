# WebRTC Implementation in FastAPI

This implementation provides a complete WebRTC signaling server using FastAPI and WebSockets, enabling real-time peer-to-peer communication for audio and video.

## Features

- **WebSocket-based signaling server** for WebRTC offer/answer exchange
- **Room-based peer management** for organizing multiple participants
- **ICE candidate handling** for NAT traversal
- **Real-time peer discovery** and connection management
- **Built-in HTML client** for testing and demonstration
- **RESTful API endpoints** for room and peer management

## Architecture

### Components

1. **WebRTCSignalingServer**: Core signaling server class that manages:
   - WebSocket connections
   - Room and peer management
   - Message routing between peers

2. **WebSocket Endpoint**: `/webrtc/signaling/{room_id}/{peer_id}`
   - Handles real-time signaling messages
   - Manages peer connections and disconnections

3. **REST API Endpoints**:
   - `GET /webrtc/rooms` - List all active rooms
   - `GET /webrtc/rooms/{room_id}/peers` - List peers in a room
   - `GET /webrtc/client` - Serve the HTML client

4. **HTML Client**: Complete WebRTC client implementation with:
   - Video/audio capture and streaming
   - Peer-to-peer connection establishment
   - Real-time signaling message handling

## Installation

1. Install the required dependencies:

```bash
cd apps/backend
pip install -e .
```

2. Start the FastAPI server:

```bash
python main.py
```

The server will be available at `http://localhost:8000`

## Usage

### Testing with the HTML Client

1. Open two browser tabs/windows
2. Navigate to `http://localhost:8000/webrtc/client`
3. In the first tab:
   - Room ID: `room1`
   - Peer ID: `peer1`
   - Click "Connect"
   - Click "Start Video"
4. In the second tab:
   - Room ID: `room1` (same room)
   - Peer ID: `peer2` (different peer)
   - Click "Connect"
   - Click "Start Video"

You should now see video streams between the two peers!

### API Endpoints

#### WebSocket Signaling
```
ws://localhost:8000/webrtc/signaling/{room_id}/{peer_id}
```

#### REST Endpoints
```bash
# List all rooms
curl http://localhost:8000/webrtc/rooms

# List peers in a specific room
curl http://localhost:8000/webrtc/rooms/room1/peers
```

### Signaling Message Format

The WebSocket signaling uses JSON messages with the following types:

#### Offer Message
```json
{
  "type": "offer",
  "offer": {
    "type": "offer",
    "sdp": "..."
  },
  "target_peer_id": "peer2"
}
```

#### Answer Message
```json
{
  "type": "answer",
  "answer": {
    "type": "answer",
    "sdp": "..."
  },
  "target_peer_id": "peer1"
}
```

#### ICE Candidate Message
```json
{
  "type": "ice_candidate",
  "candidate": {
    "candidate": "...",
    "sdpMLineIndex": 0,
    "sdpMid": "0"
  },
  "target_peer_id": "peer2"
}
```

#### System Messages
```json
// Peer joined notification
{
  "type": "peer_joined",
  "peer_id": "peer2"
}

// Peer left notification
{
  "type": "peer_left",
  "peer_id": "peer2"
}

// Existing peers list
{
  "type": "existing_peers",
  "peers": ["peer1", "peer2"]
}
```

## Integration with Frontend

### React Native Integration

For your React Native frontend, you can use the WebSocket API to connect to the signaling server:

```typescript
// WebRTC signaling client for React Native
class WebRTCSignalingClient {
  private websocket: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  
  async connect(roomId: string, peerId: string) {
    const wsUrl = `ws://your-backend-url/webrtc/signaling/${roomId}/${peerId}`;
    this.websocket = new WebSocket(wsUrl);
    
    this.websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleSignalingMessage(message);
    };
  }
  
  private handleSignalingMessage(message: any) {
    switch (message.type) {
      case 'offer':
        this.handleOffer(message.offer, message.from_peer_id);
        break;
      case 'answer':
        this.handleAnswer(message.answer, message.from_peer_id);
        break;
      case 'ice_candidate':
        this.handleIceCandidate(message.candidate, message.from_peer_id);
        break;
    }
  }
  
  private sendSignalingMessage(message: any) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }
}
```

### JavaScript/TypeScript Integration

For web clients, use the same WebSocket approach:

```javascript
// Connect to signaling server
const websocket = new WebSocket('ws://localhost:8000/webrtc/signaling/room1/peer1');

websocket.onmessage = function(event) {
  const message = JSON.parse(event.data);
  // Handle signaling messages
};

// Send offer to peer
function sendOffer(targetPeerId, offer) {
  websocket.send(JSON.stringify({
    type: 'offer',
    offer: offer,
    target_peer_id: targetPeerId
  }));
}
```

## Advanced Features

### STUN/TURN Servers

For production deployments, configure STUN/TURN servers for better NAT traversal:

```python
# In your WebRTC client
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:your-turn-server.com:3478', 
      username: 'user', 
      credential: 'pass' }
  ]
};
```

### Room Management

The signaling server supports multiple rooms. Each room maintains its own set of peers and connections.

### Error Handling

The implementation includes comprehensive error handling for:
- WebSocket connection failures
- Peer disconnections
- ICE candidate failures
- Media device access errors

## Production Considerations

1. **Security**: Implement authentication and authorization for room access
2. **Scalability**: Consider using Redis or similar for multi-instance deployments
3. **Monitoring**: Add logging and metrics for connection tracking
4. **TURN Servers**: Deploy TURN servers for better connectivity
5. **HTTPS/WSS**: Use secure connections in production

## Troubleshooting

### Common Issues

1. **Camera/Microphone Access**: Ensure proper permissions are granted
2. **Firewall/NAT**: WebRTC may require STUN/TURN servers for NAT traversal
3. **Browser Compatibility**: Test across different browsers and devices
4. **Network Issues**: Check WebSocket connectivity and CORS settings

### Debug Mode

Enable debug logging by setting the log level:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Next Steps

1. **Authentication**: Add user authentication and room access control
2. **Media Processing**: Implement server-side media processing with aiortc
3. **Recording**: Add call recording capabilities
4. **Mobile Support**: Optimize for mobile devices and React Native
5. **Scalability**: Implement horizontal scaling with Redis pub/sub
