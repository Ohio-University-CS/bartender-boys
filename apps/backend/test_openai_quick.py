#!/usr/bin/env python3
"""
Quick test to check OpenAI API key and connection
"""
import asyncio
import os
import sys
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_api_key():
    """Test if the API key works with a simple HTTP request"""
    import httpx
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not set")
        return False
    
    print(f"✅ API key found: {api_key[:10]}...")
    
    try:
        async with httpx.AsyncClient() as client:
            # Test with a simple API call first
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            
            if response.status_code == 200:
                print("✅ API key is valid")
                return True
            else:
                print(f"❌ API key test failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ API key test error: {e}")
        return False

async def test_websocket_connection():
    """Test WebSocket connection to OpenAI"""
    import websockets
    import json
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not set")
        return False
    
    websocket_url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "OpenAI-Beta": "realtime=v1"
    }
    
    print(f"🔌 Testing WebSocket connection to: {websocket_url}")
    
    try:
        async with websockets.connect(websocket_url, extra_headers=headers) as websocket:
            print("✅ WebSocket connection successful!")
            
            # Send a test message
            test_message = {
                "type": "conversation.item.create",
                "item": {
                    "type": "message",
                    "role": "user", 
                    "content": "Hello, this is a test message"
                }
            }
            
            print(f"📤 Sending test message: {test_message}")
            await websocket.send(json.dumps(test_message))
            
            # Wait for response
            print("⏳ Waiting for response...")
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"📥 Received response: {response}")
                return True
            except asyncio.TimeoutError:
                print("⏰ No response received within 10 seconds")
                return False
                
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        return False

async def main():
    print("=" * 60)
    print("OpenAI Realtime API Connection Test")
    print("=" * 60)
    
    # Test 1: API Key
    print("\n1. Testing API Key...")
    api_key_ok = await test_api_key()
    
    if not api_key_ok:
        print("\n❌ API key test failed. Please check your OPENAI_API_KEY.")
        return
    
    # Test 2: WebSocket Connection
    print("\n2. Testing WebSocket Connection...")
    websocket_ok = await test_websocket_connection()
    
    print("\n" + "=" * 60)
    if api_key_ok and websocket_ok:
        print("🎉 All tests passed! OpenAI Realtime API is working.")
    else:
        print("💥 Some tests failed. Check the errors above.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
