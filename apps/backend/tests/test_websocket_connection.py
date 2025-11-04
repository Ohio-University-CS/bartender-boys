"""
Test WebSocket connection functionality.

This test verifies that clients can successfully connect to the WebSocket endpoint.
"""
import pytest
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add parent directory to path to import main
sys.path.insert(0, str(Path(__file__).parent.parent))


def test_websocket_connection():
    """
    Test that a client can successfully connect to the WebSocket endpoint.
    
    This test:
    1. Connects to the /openai/realtime/{client_id} endpoint
    2. Verifies the connection is accepted
    3. Verifies a connection confirmation message is received
    4. Verifies the client can send messages
    5. Verifies proper cleanup on disconnect
    """
    from main import app
    from services.websocket_service import websocket_manager
    
    client_id = "test-client-123"
    
    # Use TestClient for WebSocket support
    with TestClient(app) as client:
        # Connect to the WebSocket endpoint
        with client.websocket_connect(f"/openai/realtime/{client_id}") as websocket:
            # Verify connection is established
            assert websocket_manager.is_connected(client_id), f"Client {client_id} should be connected"
            
            # Wait for connection confirmation message
            # The server sends a ConnectionEstablished message on connect
            data = websocket.receive_json()
            
            # Verify we received a ConnectionEstablished message with correct structure
            assert data.get("type") == "connection_established", \
                f"Expected type 'connection_established', got: {data.get('type')}"
            assert data.get("client_id") == client_id, \
                f"Expected client_id '{client_id}', got: {data.get('client_id')}"
            assert "message" in data, \
                f"Expected 'message' field in connection message, got: {data}"
            assert "openai_connected" in data, \
                f"Expected 'openai_connected' field in connection message, got: {data}"
            
            # Verify the client is in active connections
            active_clients = websocket_manager.get_active_clients()
            assert client_id in active_clients, \
                f"Client {client_id} should be in active clients list: {active_clients}"
            
            # Test sending a message from client
            test_message = {"type": "test", "data": "hello"}
            websocket.send_json(test_message)
            
            # Note: We don't expect a response for this test message,
            # but we verify the message was sent without errors
            
            # Verify connection is still active
            assert websocket_manager.is_connected(client_id), \
                f"Client {client_id} should still be connected after sending message"
    
    # After context exits, verify connection is cleaned up
    assert not websocket_manager.is_connected(client_id), \
        f"Client {client_id} should be disconnected after closing connection"


def test_multiple_websocket_connections():
    """
    Test that multiple clients can connect simultaneously.
    """
    from main import app
    from services.websocket_service import websocket_manager
    
    client_ids = ["test-client-1", "test-client-2", "test-client-3"]
    
    with TestClient(app) as client:
        # Connect multiple clients using nested context managers
        with client.websocket_connect(f"/openai/realtime/{client_ids[0]}") as ws1, \
             client.websocket_connect(f"/openai/realtime/{client_ids[1]}") as ws2, \
             client.websocket_connect(f"/openai/realtime/{client_ids[2]}") as ws3:
            
            websockets = [
                (client_ids[0], ws1),
                (client_ids[1], ws2),
                (client_ids[2], ws3),
            ]
            
            # Verify all clients are connected
            for client_id, websocket in websockets:
                assert websocket_manager.is_connected(client_id), \
                    f"Client {client_id} should be connected"
                
                # Receive connection confirmation
                data = websocket.receive_json()
                assert data.get("type") == "connection_established", \
                    f"Expected type 'connection_established' for {client_id}, got: {data.get('type')}"
                assert data.get("client_id") == client_id, \
                    f"Expected client_id '{client_id}', got: {data.get('client_id')}"
            
            # Verify all are in active clients
            active_clients = websocket_manager.get_active_clients()
            for client_id in client_ids:
                assert client_id in active_clients, \
                    f"Client {client_id} should be in active clients: {active_clients}"
        
        # After contexts exit, verify all are disconnected
        for client_id in client_ids:
            assert not websocket_manager.is_connected(client_id), \
                f"Client {client_id} should be disconnected"


def test_websocket_reconnection_supersedes_old_connection():
    """
    Test that a new connection from the same client_id supersedes the old one.
    """
    from main import app
    from services.websocket_service import websocket_manager
    
    client_id = "test-client-reconnect"
    
    with TestClient(app) as client:
        # First connection
        with client.websocket_connect(f"/openai/realtime/{client_id}") as ws1:
            assert websocket_manager.is_connected(client_id)
            data1 = ws1.receive_json()
            
            # Second connection with same client_id should supersede the first
            with client.websocket_connect(f"/openai/realtime/{client_id}") as ws2:
                # First connection should be closed
                # The old connection should be disconnected
                # New connection should be active
                assert websocket_manager.is_connected(client_id)
                
                # Receive connection confirmation on new connection
                data2 = ws2.receive_json()
                assert data2.get("type") == "connection_established", \
                    f"Expected type 'connection_established', got: {data2.get('type')}"
                assert data2.get("client_id") == client_id, \
                    f"Expected client_id '{client_id}', got: {data2.get('client_id')}"
            
            # After second connection closes, first should also be gone
            assert not websocket_manager.is_connected(client_id)

