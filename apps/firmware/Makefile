SHELL := /bin/bash

.PHONY: run dev run-ngrok dev-ngrok stop-ngrok

PORT := 8001
PID_FILE := .uvicorn.pid
NGROK_PID_FILE := .ngrok.pid

# Run the firmware backend normally (no reload)
run:
	uv run uvicorn main:app --host 0.0.0.0 --port $(PORT)

# Run the firmware backend with hot reload
dev:
	uv run uvicorn main:app --reload --host 0.0.0.0 --port $(PORT)

# Run with ngrok (production mode) - uses helper script for better process management
run-ngrok: stop-ngrok
	@./start-with-ngrok.sh prod

# Run with ngrok (development mode with hot reload) - uses helper script
dev-ngrok: stop-ngrok
	@./start-with-ngrok.sh dev

# Stop ngrok and uvicorn processes
stop-ngrok:
	@if [ -f $(NGROK_PID_FILE) ]; then \
		PID=$$(cat $(NGROK_PID_FILE) 2>/dev/null); \
		if [ -n "$$PID" ] && kill -0 $$PID 2>/dev/null; then \
			kill $$PID 2>/dev/null || true; \
		fi; \
		rm -f $(NGROK_PID_FILE); \
		echo "Stopped ngrok"; \
	fi
	@if [ -f $(PID_FILE) ]; then \
		PID=$$(cat $(PID_FILE) 2>/dev/null); \
		if [ -n "$$PID" ] && kill -0 $$PID 2>/dev/null; then \
			kill $$PID 2>/dev/null || true; \
		fi; \
		rm -f $(PID_FILE); \
		echo "Stopped uvicorn"; \
	fi
	@pkill -f "ngrok http" 2>/dev/null || true
	@pkill -f "uvicorn main:app" 2>/dev/null || true
	@echo "Cleanup complete"

