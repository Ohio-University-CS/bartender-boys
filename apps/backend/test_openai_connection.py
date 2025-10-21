#!/usr/bin/env python3
"""
Test script for OpenAI Realtime API connection
"""
import asyncio
import json
import os
import sys
from datetime import datetime

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from webrtc.openai_integration import OpenAIRealtimeManager

async def test_openai_connection():
    """Test the OpenAI Realtime API connection"""
    print("Testing OpenAI Realtime API connection...")
    
    # Check if API key is set
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable not set")
        print("Please set your OpenAI API key:")
        print("export OPENAI_API_KEY='your-api-key-here'")
        return False
    
    print(f"✅ API key found: {api_key[:10]}...")
    
    # Create manager instance
    manager = OpenAIRealtimeManager()
    
    try:
        # Test connection
        print("🔌 Attempting to connect to OpenAI Realtime API...")
        result = await manager.connect_to_openai_realtime("test_client")
        
        print("✅ Connection successful!")
        print(f"Status: {result}")
        
        # Test sending a message
        print("📤 Testing message sending...")
        test_message = {
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": "Hello, this is a test message"
            }
        }
        
        await manager.send_message_to_openai(test_message)
        print("✅ Test message sent successfully!")
        
        # Wait a bit to see if we get any responses
        print("⏳ Waiting for responses...")
        await asyncio.sleep(2)
        
        # Disconnect
        await manager.disconnect_from_openai()
        print("🔌 Disconnected from OpenAI")
        
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

async def main():
    """Main test function"""
    print("=" * 50)
    print("OpenAI Realtime API Connection Test")
    print("=" * 50)
    
    success = await test_openai_connection()
    
    print("=" * 50)
    if success:
        print("🎉 Test completed successfully!")
    else:
        print("💥 Test failed!")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())
