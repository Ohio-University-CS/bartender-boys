#!/bin/bash

# Script to start FastAPI server with ngrok tunnel
# Usage: ./start-with-ngrok.sh [dev]

PORT=8001
MODE=${1:-prod}
PID_FILE=".uvicorn.pid"
NGROK_PID_FILE=".ngrok.pid"

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down..."
    if [ -f "$NGROK_PID_FILE" ]; then
        kill $(cat "$NGROK_PID_FILE") 2>/dev/null || true
        rm -f "$NGROK_PID_FILE"
        echo "Stopped ngrok"
    fi
    if [ -f "$PID_FILE" ]; then
        kill $(cat "$PID_FILE") 2>/dev/null || true
        rm -f "$PID_FILE"
        echo "Stopped uvicorn"
    fi
    pkill -f "ngrok http" 2>/dev/null || true
    pkill -f "uvicorn main:app" 2>/dev/null || true
    exit 0
}

# Set up trap
trap cleanup INT TERM

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "Error: ngrok is not installed or not in PATH"
    echo "Install it from: https://ngrok.com/download"
    exit 1
fi

# Start FastAPI server
echo "Starting FastAPI server on port $PORT..."
if [ "$MODE" = "dev" ]; then
    uv run uvicorn main:app --reload --host 0.0.0.0 --port $PORT &
else
    uv run uvicorn main:app --host 0.0.0.0 --port $PORT &
fi
echo $! > "$PID_FILE"
sleep 2

# Start ngrok
echo "Starting ngrok tunnel..."
ngrok http $PORT --log=stdout > .ngrok.log 2>&1 &
echo $! > "$NGROK_PID_FILE"
sleep 3

# Get ngrok URL
echo ""
echo "=========================================="
echo "FastAPI server running on http://localhost:$PORT"
echo "Waiting for ngrok URL..."
sleep 2

NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | grep -o 'https://[^"]*' | head -1)

if [ -n "$NGROK_URL" ]; then
    echo "ngrok URL: $NGROK_URL"
    echo ""
    echo "Set this URL in your backend environment:"
    echo "  export FIRMWARE_API_URL=$NGROK_URL"
else
    echo "ngrok URL: Check http://localhost:4040 for the tunnel URL"
    echo "Or run: curl http://localhost:4040/api/tunnels"
fi
echo "=========================================="
echo "Press Ctrl+C to stop"
echo ""

# Wait for processes
wait

