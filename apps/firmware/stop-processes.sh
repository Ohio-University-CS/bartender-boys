#!/bin/bash
# Simple script to stop ngrok and uvicorn processes

PID_FILE=".uvicorn.pid"
NGROK_PID_FILE=".ngrok.pid"

# Stop ngrok
if [ -f "$NGROK_PID_FILE" ]; then
    PID=$(cat "$NGROK_PID_FILE" 2>/dev/null || echo "")
    if [ -n "$PID" ] && [ "$PID" -gt 0 ] 2>/dev/null; then
        if kill -0 "$PID" 2>/dev/null; then
            kill -TERM "$PID" 2>/dev/null || true
            sleep 0.2
            kill -KILL "$PID" 2>/dev/null || true
        fi
    fi
    rm -f "$NGROK_PID_FILE"
    echo "Stopped ngrok"
fi

# Stop uvicorn
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" 2>/dev/null || echo "")
    if [ -n "$PID" ] && [ "$PID" -gt 0 ] 2>/dev/null; then
        if kill -0 "$PID" 2>/dev/null; then
            kill -TERM "$PID" 2>/dev/null || true
            sleep 0.2
            kill -KILL "$PID" 2>/dev/null || true
        fi
    fi
    rm -f "$PID_FILE"
    echo "Stopped uvicorn"
fi

# Fallback: kill by process name
pkill -f "ngrok http" 2>/dev/null || true
pkill -f "uvicorn main:app" 2>/dev/null || true

echo "Cleanup complete"

