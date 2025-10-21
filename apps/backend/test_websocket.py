#!/usr/bin/env python3
"""
Test WebSocket connection to the server
"""
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/openai/realtime/test_client"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to server WebSocket")
            
            # Send a test message
            message = {
                "type": "conversation.item.create",
                "item": {
                    "type": "message",
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": "Hello! I would like to order a drink."
                        }
                    ]
                }
            }
            
            print(f"📤 Sending message: {message}")
            await websocket.send(json.dumps(message))
            
            # Wait a moment for the message to be processed
            await asyncio.sleep(1)
            
            # Request a response from the AI
            response_request = {
                "type": "response.create"
            }
            print(f"📤 Requesting AI response: {response_request}")
            await websocket.send(json.dumps(response_request))
            
            # Wait for responses
            print("⏳ Waiting for responses...")
            for i in range(10):  # Wait for up to 10 messages
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    data = json.loads(response)
                    print(f"📥 Received: {data}")
                    
                    # Check if we got a response from the AI
                    if data.get("type") == "response.text.delta":
                        print(f"🤖 AI Response: {data.get('delta', '')}")
                    elif data.get("type") == "response.text.done":
                        print(f"✅ AI Response Complete: {data.get('content', '')}")
                        
                except asyncio.TimeoutError:
                    print("⏰ Timeout waiting for response")
                    break
                    
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
