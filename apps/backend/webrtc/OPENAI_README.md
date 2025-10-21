# OpenAI Realtime API Integration

This module provides integration with OpenAI's Realtime API, enabling real-time AI-powered conversations with audio support. It's designed to work alongside your existing WebRTC peer-to-peer infrastructure.

## Features

- **Single Connection Support**: Designed for one active connection at a time
- **Ephemeral Token Management**: Automatic token generation and renewal
- **WebSocket Communication**: Real-time bidirectional communication
- **Function Calling Support**: Handle AI function calls for your business logic
- **WebRTC Signaling**: Ready for audio/video integration
- **Built-in Test Client**: HTML interface for testing and development

## Architecture

### Components

1. **OpenAIRealtimeManager**: Core manager class that handles:
   - WebSocket connections
   - Token management and renewal
   - Function call processing
   - Message routing

2. **WebSocket Endpoint**: `/openai/realtime/{client_id}`
   - Handles real-time communication with clients
   - Manages single connection limitation
   - Processes AI function calls

3. **REST API Endpoints**:
   - `POST /openai/token` - Get ephemeral token
   - `GET /openai/status` - Check connection status
   - `GET /openai/client` - Serve HTML test client

## Setup

### 1. Environment Configuration

Add your OpenAI API key to your environment:

```bash
export OPENAI_API_KEY="your-openai-api-key-here"
```

Or add it to your `.env` file:
```
OPENAI_API_KEY=your-openai-api-key-here
```

### 2. Install Dependencies

The required dependencies are already included in your `pyproject.toml`:
- `openai>=1.0.0`
- `httpx>=0.25.0`
- `fastapi` (already installed)
- `websockets` (already installed)

### 3. Start the Server

```bash
cd apps/backend
source venv/bin/activate
python main.py
```

## Usage

### Testing with the HTML Client

1. Open your browser and navigate to:
   ```
   http://localhost:8000/openai/client
   ```

2. Enter a client ID and click "Connect to OpenAI"

3. Use the test buttons to:
   - Get an ephemeral token
   - Test function calls
   - Test WebRTC signaling

### API Endpoints

#### WebSocket Connection
```
ws://localhost:8000/openai/realtime/{client_id}
```

#### REST Endpoints
```bash
# Get ephemeral token
curl -X POST http://localhost:8000/openai/token

# Check status
curl http://localhost:8000/openai/status

# Serve test client
curl http://localhost:8000/openai/client
```

### Message Format

The WebSocket communication uses JSON messages:

#### Client to Server Messages

**Get Token:**
```json
{
  "type": "get_token"
}
```

**Function Call:**
```json
{
  "type": "function_call",
  "function_name": "check_id",
  "arguments": {
    "id_number": "123456789"
  }
}
```

**WebRTC Signal:**
```json
{
  "type": "webrtc_signal",
  "signal": {
    "type": "offer",
    "sdp": "v=0\r\no=- 123456789 2 IN IP4 127.0.0.1..."
  }
}
```

#### Server to Client Messages

**Token Response:**
```json
{
  "type": "token_response",
  "token": "ephemeral-token-here",
  "expires_in": 60
}
```

**Function Call Result:**
```json
{
  "type": "function_call_result",
  "function_name": "check_id",
  "result": {
    "status": "id_checked",
    "valid": true
  }
}
```

**Error Message:**
```json
{
  "type": "error",
  "message": "Error description"
}
```

## Function Calling

The integration supports custom function calls that the AI can invoke. Currently implemented functions:

### Available Functions

1. **check_id**: Verify ID validity
   ```json
   {
     "function_name": "check_id",
     "arguments": {
       "id_number": "123456789"
     }
   }
   ```

2. **get_menu**: Retrieve menu items
   ```json
   {
     "function_name": "get_menu",
     "arguments": {}
   }
   ```

3. **place_order**: Place an order
   ```json
   {
     "function_name": "place_order",
     "arguments": {
       "item": "Margarita",
       "quantity": 2
     }
   }
   ```

### Adding Custom Functions

To add your own functions, modify the `process_function_call` method in `openai_integration.py`:

```python
async def process_function_call(self, function_name: str, arguments: Dict[str, Any]) -> Any:
    if function_name == "your_custom_function":
        # Your custom logic here
        return {"result": "success"}
    
    # ... existing functions
```

## Integration with Existing WebRTC

This OpenAI integration works alongside your existing peer-to-peer WebRTC system:

- **Peer-to-Peer WebRTC**: `/webrtc/signaling/{room_id}/{peer_id}` - For client-to-client communication
- **OpenAI Realtime**: `/openai/realtime/{client_id}` - For client-to-AI communication

Both systems can run simultaneously, allowing you to:
1. Have AI-powered conversations with customers
2. Enable peer-to-peer video calls between staff members
3. Mix both modes as needed

## Production Considerations

### Security
- **API Key Management**: Store OpenAI API keys securely
- **Token Expiration**: Tokens expire in 60 seconds, implement renewal logic
- **Single Connection**: Only one client can connect at a time

### Performance
- **Token Caching**: Consider caching tokens for multiple requests
- **Connection Management**: Implement proper cleanup on disconnection
- **Error Handling**: Add comprehensive error handling for production

### Monitoring
- **Connection Status**: Monitor active connections via `/openai/status`
- **Token Usage**: Track token generation and expiration
- **Function Calls**: Log function call performance and results

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Ensure `OPENAI_API_KEY` environment variable is set
   - Check that the API key is valid and has Realtime API access

2. **"Another client is already connected"**
   - Only one client can connect at a time
   - Disconnect the current client before connecting a new one

3. **Token expiration errors**
   - Tokens expire in 60 seconds
   - Implement automatic token renewal in your client

4. **WebSocket connection failures**
   - Check that the server is running on port 8000
   - Verify WebSocket URL format: `ws://localhost:8000/openai/realtime/{client_id}`

### Debug Mode

Enable debug logging by setting the log level:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Next Steps

1. **Real OpenAI Integration**: Connect to actual OpenAI Realtime API servers
2. **Audio Processing**: Implement audio capture and playback
3. **Function Expansion**: Add more business-specific functions
4. **Authentication**: Add user authentication and authorization
5. **Multi-tenant**: Support multiple concurrent connections
6. **Monitoring**: Add comprehensive logging and metrics

## Example Integration

Here's how to integrate this into your React Native frontend:

```typescript
class OpenAIRealtimeClient {
  private websocket: WebSocket | null = null;
  
  async connect(clientId: string) {
    const wsUrl = `ws://your-backend-url/openai/realtime/${clientId}`;
    this.websocket = new WebSocket(wsUrl);
    
    this.websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
  }
  
  async getToken() {
    if (this.websocket) {
      this.websocket.send(JSON.stringify({ type: 'get_token' }));
    }
  }
  
  async callFunction(functionName: string, args: any) {
    if (this.websocket) {
      this.websocket.send(JSON.stringify({
        type: 'function_call',
        function_name: functionName,
        arguments: args
      }));
    }
  }
}
```

This integration provides a solid foundation for adding AI-powered real-time interactions to your Bartender Boys application!
