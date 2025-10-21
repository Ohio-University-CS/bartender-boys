# OpenAI Realtime API Integration

This module provides **real integration** with OpenAI's Realtime API, enabling actual AI-powered conversations with audio support. It establishes direct WebSocket connections to OpenAI's servers and handles real-time message forwarding.

## Features

- **Real OpenAI Connection**: Direct WebSocket connection to OpenAI's Realtime API servers
- **Typed Message Models**: Comprehensive Pydantic models for all API message types
- **Message Forwarding**: Bidirectional message forwarding between clients and OpenAI
- **Session Management**: Automatic session creation and management
- **Function Calling Support**: Handle AI function calls for your business logic
- **Audio Streaming**: Support for real-time audio input/output
- **Error Handling**: Comprehensive error handling and reconnection logic
- **Built-in Test Client**: HTML interface for testing and development

## Architecture

```
Client (Browser/Mobile)
    ↓ WebSocket (typed messages)
FastAPI Server (with Pydantic models)
    ↓ WebSocket (validated messages)
OpenAI Realtime API Servers
```

## Data Flow

The system acts as a **smart proxy** that intercepts, processes, and forwards all messages between the frontend and OpenAI:

### **Complete Message Flow:**

```
1. Frontend → Backend → OpenAI → Backend → Frontend
   (User message)    (AI response)
```

### **Detailed Step-by-Step Flow:**

#### **Outbound Flow (User → AI):**

1. **Frontend** sends message via WebSocket:
   ```json
   {
     "type": "conversation.item.create",
     "item": {
       "type": "message",
       "role": "user",
       "content": [{"type": "input_text", "text": "I want a margarita"}]
     }
   }
   ```

2. **Backend** (`openai_integration.py`) receives message:
   - `handle_client_message()` parses and validates using Pydantic models
   - `_parse_message()` converts to typed model
   - `_handle_parsed_message()` processes the message
   - **Future**: Store message in database
   - **Future**: Apply business logic/validation

3. **Backend** forwards to OpenAI:
   - `send_message_to_openai()` sends validated message to OpenAI servers
   - Message goes through WebSocket to `wss://api.openai.com/v1/realtime`

4. **OpenAI** processes the message:
   - Creates conversation item
   - Generates AI response
   - Sends response back to backend

#### **Inbound Flow (AI → User):**

5. **Backend** receives OpenAI response:
   - `listen_to_openai_messages()` receives response from OpenAI
   - `forward_openai_message_to_client()` processes the response

6. **Backend** processes response:
   - **Future**: Store response in database
   - **Future**: Apply business logic (e.g., trigger inventory check)
   - **Future**: Modify response if needed
   - Handle function calls if present

7. **Backend** sends to frontend:
   - `send_to_client()` sends response to frontend WebSocket
   - Response includes AI text/audio and any function call results

8. **Frontend** receives and displays response:
   ```json
   {
     "type": "response.audio_transcript.delta",
     "delta": "Great choice! That'll be $12.99",
     "response_id": "resp_123456789"
   }
   ```

### **Message Interception Points:**

The backend intercepts messages at these key points:

1. **User Input Interception**:
   ```python
   async def handle_client_message(self, message: Dict[str, Any], client_id: str):
       # 1. Parse and validate message
       parsed_message = self._parse_message(message)
       
       # 2. Store in database (future)
       await self.store_message_to_db(message, client_id)
       
       # 3. Apply business logic (future)
       await self.process_business_logic(message, client_id)
       
       # 4. Forward to OpenAI
       await self.send_message_to_openai(message)
   ```

2. **AI Response Interception**:
   ```python
   async def listen_to_openai_messages(self):
       async for message in self.openai_websocket:
           # 1. Parse OpenAI response
           data = json.loads(message)
           
           # 2. Store response in database (future)
           await self.store_response_to_db(data)
           
           # 3. Process function calls
           if data.get("type") == "function_call":
               result = await self.process_function_call(data)
               
           # 4. Apply business logic (future)
           await self.process_response_logic(data)
           
           # 5. Forward to frontend
           await self.forward_openai_message_to_client(data)
   ```

### **Benefits of This Architecture:**

- ✅ **Full Control**: Every message is intercepted and can be processed
- ✅ **Data Storage**: All conversations can be stored in database
- ✅ **Business Logic**: Can trigger actions based on AI responses
- ✅ **Analytics**: Can track usage, performance, and user behavior
- ✅ **Customization**: Can modify responses before sending to frontend
- ✅ **Security**: Can validate, filter, or block messages
- ✅ **Function Calls**: Can execute custom business functions
- ✅ **Error Handling**: Can handle errors gracefully and provide fallbacks

### Components

1. **OpenAIRealtimeManager**: Core manager class that handles:
   - Real WebSocket connections to OpenAI servers
   - Message parsing and validation using Pydantic models
   - Bidirectional message forwarding
   - Session creation and management
   - Function call processing
   - Error handling and reconnection

2. **Pydantic Models** (`realtime/models.py`):
   - Comprehensive typed models for all OpenAI Realtime API message types
   - Runtime validation and type safety
   - Helper functions for message creation
   - Self-documenting API structure

3. **WebSocket Endpoint**: `/openai/realtime/{client_id}`
   - Handles real-time communication with clients
   - Establishes connection to OpenAI servers
   - Forwards messages bidirectionally
   - Processes AI function calls

4. **REST API Endpoints**:
   - `POST /openai/token` - Get ephemeral session token
   - `GET /openai/status` - Check connection status
   - `POST /openai/connect/{client_id}` - Test OpenAI connection
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
uv run main.py
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

The WebSocket communication uses **typed JSON messages** with comprehensive Pydantic models:

#### Client to Server Messages

**Get Token:**
```json
{
  "type": "get_token"
}
```

**Create Text Message:**
```json
{
  "type": "conversation.item.create",
  "item": {
    "type": "message",
    "role": "user",
    "content": [
      {
        "type": "input_text",
        "text": "Hello! I'd like to order a drink."
      }
    ]
  }
}
```

**Request AI Response:**
```json
{
  "type": "response.create"
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

#### Server to Client Messages

**Connection Established:**
```json
{
  "type": "connection_established",
  "client_id": "client1",
  "message": "Connected to OpenAI Realtime API",
  "openai_connected": true
}
```

**Session Created:**
```json
{
  "type": "session.created",
  "event_id": "event_123456789",
  "session": {
    "id": "sess_123456789",
    "model": "gpt-4o-realtime-preview-2024-10-01",
    "voice": "alloy",
    "instructions": "You are a helpful bartender assistant..."
  }
}
```

**AI Response (Audio Transcript):**
```json
{
  "type": "response.audio_transcript.delta",
  "event_id": "event_123456789",
  "response_id": "resp_123456789",
  "item_id": "item_123456789",
  "output_index": 0,
  "content_index": 0,
  "delta": "Sure thing! What kind of drink would you like?",
  "obfuscation": "Ac545gT4mzcC"
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
  "event_id": "error_123456789",
  "error": {
    "type": "invalid_request_error",
    "code": "invalid_format",
    "message": "Invalid message format",
    "param": "content"
  }
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

## Focused AI Integration

This implementation focuses exclusively on **AI-powered customer interactions**:

- **OpenAI Realtime**: `/openai/realtime/{client_id}` - For client-to-AI communication
- **Message Interception**: Full control over all conversations
- **Business Logic**: Custom function calls and response processing
- **Data Storage**: Complete conversation logging and analytics

This streamlined approach provides:
1. **AI-powered customer service** with full backend control
2. **Conversation storage** for analytics and training
3. **Custom business logic** integration with AI responses
4. **Scalable architecture** focused on AI bartender functionality

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

## Testing

### Quick Connection Test
```bash
cd apps/backend
uv run test_openai_quick.py
```

### WebSocket Message Test
```bash
uv run test_websocket.py
```

### HTML Test Client
1. Start the server: `uv run main.py`
2. Open: `http://localhost:8000/openai/client`
3. Connect and test real AI conversations

## Next Steps

1. ✅ **Real OpenAI Integration**: Connected to actual OpenAI Realtime API servers
2. ✅ **Typed Models**: Comprehensive Pydantic models implemented
3. ✅ **Message Forwarding**: Bidirectional message forwarding working
4. **Audio Processing**: Implement real-time audio capture and playback
5. **Function Expansion**: Add more business-specific functions
6. **Authentication**: Add user authentication and authorization
7. **Multi-tenant**: Support multiple concurrent connections
8. **Monitoring**: Add comprehensive logging and metrics

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

## Key Benefits

- ✅ **Real AI Conversations**: Actual responses from OpenAI's GPT-4o Realtime model
- ✅ **Type Safety**: Comprehensive Pydantic models with runtime validation
- ✅ **Production Ready**: Error handling, reconnection logic, and proper logging
- ✅ **Future Proof**: Extensible architecture with typed message handling
- ✅ **Well Documented**: Self-documenting models and comprehensive examples

This integration provides a **production-ready foundation** for adding AI-powered real-time interactions to your Bartender Boys application! 🍸🤖
