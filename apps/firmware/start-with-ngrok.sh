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

# Determine how to run uvicorn
# Handle sudo case - try to use original user's environment
if [ "$EUID" -eq 0 ] && [ -n "$SUDO_USER" ]; then
    # Running as root via sudo - use original user's environment
    SUDO_HOME=$(eval echo ~$SUDO_USER)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    # Try venv in current directory first
    if [ -f "$SCRIPT_DIR/venv/bin/activate" ]; then
        source "$SCRIPT_DIR/venv/bin/activate"
        UVICORN_CMD="python -m uvicorn"
        echo "Using venv from script directory"
    elif [ -f "$SCRIPT_DIR/.venv/bin/activate" ]; then
        source "$SCRIPT_DIR/.venv/bin/activate"
        UVICORN_CMD="python -m uvicorn"
        echo "Using .venv from script directory"
    # Try user's uv installation
    elif [ -f "$SUDO_HOME/.cargo/bin/uv" ]; then
        UVICORN_CMD="$SUDO_HOME/.cargo/bin/uv run uvicorn"
        echo "Using uv from user's home directory"
    elif [ -f "$SUDO_HOME/.local/bin/uv" ]; then
        UVICORN_CMD="$SUDO_HOME/.local/bin/uv run uvicorn"
        echo "Using uv from user's local bin"
    else
        # Fall back to system Python
        UVICORN_CMD="python3 -m uvicorn"
        echo "Warning: Using system Python (venv/uv not found)"
    fi
else
    # Normal user execution - check for venv first
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$SCRIPT_DIR/venv/bin/activate" ]; then
        source "$SCRIPT_DIR/venv/bin/activate"
        UVICORN_CMD="python -m uvicorn"
        echo "Using venv from script directory"
    elif [ -f "$SCRIPT_DIR/.venv/bin/activate" ]; then
        source "$SCRIPT_DIR/.venv/bin/activate"
        UVICORN_CMD="python -m uvicorn"
        echo "Using .venv from script directory"
    elif [ -n "$VIRTUAL_ENV" ] && [ -f "$VIRTUAL_ENV/bin/activate" ]; then
        source "$VIRTUAL_ENV/bin/activate"
        UVICORN_CMD="python -m uvicorn"
        echo "Using active virtual environment"
    elif command -v uv &> /dev/null; then
        UVICORN_CMD="uv run uvicorn"
        echo "Using: uv"
    elif command -v python3 &> /dev/null; then
        UVICORN_CMD="python3 -m uvicorn"
        echo "Using: python3"
    elif command -v python &> /dev/null; then
        UVICORN_CMD="python -m uvicorn"
        echo "Using: python"
    else
        echo "Error: Neither 'uv' nor 'python3'/'python' found in PATH"
        echo "Please install uv (https://docs.astral.sh/uv/) or ensure Python is installed"
        exit 1
    fi
fi

# Start FastAPI server
echo "Starting FastAPI server on port $PORT..."
echo "Using: $UVICORN_CMD"
if [ "$MODE" = "dev" ]; then
    $UVICORN_CMD main:app --reload --host 0.0.0.0 --port $PORT &
else
    $UVICORN_CMD main:app --host 0.0.0.0 --port $PORT &
fi
echo $! > "$PID_FILE"
sleep 2

# Start ngrok
echo "Starting ngrok tunnel..."
ngrok http $PORT --log=stdout > .ngrok.log 2>&1 &
echo $! > "$NGROK_PID_FILE"
sleep 5

# Get ngrok URL with retries
echo ""
echo "=========================================="
echo "FastAPI server running on http://localhost:$PORT"
echo "Waiting for ngrok URL..."

NGROK_URL=""
MAX_RETRIES=10
RETRY_COUNT=0

while [ -z "$NGROK_URL" ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
    
    # Try to get URL from ngrok API
    API_RESPONSE=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null)
    
    if [ -n "$API_RESPONSE" ]; then
        # Try multiple extraction methods
        # Method 1: Using grep for public_url
        NGROK_URL=$(echo "$API_RESPONSE" | grep -o '"public_url":"https://[^"]*' | grep -o 'https://[^"]*' | head -1)
        
        # Method 2: If jq is available, use it (more reliable)
        if [ -z "$NGROK_URL" ] && command -v jq &> /dev/null; then
            NGROK_URL=$(echo "$API_RESPONSE" | jq -r '.tunnels[0].public_url' 2>/dev/null | grep '^https://')
        fi
        
        # Method 3: Alternative grep pattern
        if [ -z "$NGROK_URL" ]; then
            NGROK_URL=$(echo "$API_RESPONSE" | grep -oP '"public_url"\s*:\s*"https://[^"]*' | grep -oP 'https://[^"]*' | head -1)
        fi
    fi
    
    if [ -z "$NGROK_URL" ]; then
        echo -n "."
    fi
done

echo ""

if [ -n "$NGROK_URL" ]; then
    echo "ngrok URL: $NGROK_URL"
    echo ""
    echo "Set this URL in your backend environment:"
    echo "  export FIRMWARE_API_URL=$NGROK_URL"
else
    echo "Could not automatically detect ngrok URL."
    echo ""
    echo "You can find it by:"
    echo "  1. Opening http://localhost:4040 in your browser"
    echo "  2. Running: curl http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'"
    echo "  3. Checking the ngrok web interface"
fi
echo "=========================================="
echo "Press Ctrl+C to stop"
echo ""

# Wait for processes
wait

