SHELL := /bin/bash

.PHONY: run dev run-ngrok dev-ngrok stop-ngrok

PORT := 8001
PID_FILE := .uvicorn.pid
NGROK_PID_FILE := .ngrok.pid

# Run the firmware backend normally (no reload)
run:
	@if command -v uv &> /dev/null; then \
		uv run uvicorn main:app --host 0.0.0.0 --port $(PORT); \
	elif command -v python3 &> /dev/null; then \
		python3 -m uvicorn main:app --host 0.0.0.0 --port $(PORT); \
	else \
		python -m uvicorn main:app --host 0.0.0.0 --port $(PORT); \
	fi

# Run the firmware backend with hot reload
dev:
	@if command -v uv &> /dev/null; then \
		uv run uvicorn main:app --reload --host 0.0.0.0 --port $(PORT); \
	elif command -v python3 &> /dev/null; then \
		python3 -m uvicorn main:app --reload --host 0.0.0.0 --port $(PORT); \
	else \
		python -m uvicorn main:app --reload --host 0.0.0.0 --port $(PORT); \
	fi

# Run with ngrok (production mode) - uses helper script for better process management
run-ngrok:
	@-$(MAKE) stop-ngrok || true
	@./start-with-ngrok.sh prod

# Run with ngrok (development mode with hot reload) - uses helper script
dev-ngrok:
	@-$(MAKE) stop-ngrok || true
	@./start-with-ngrok.sh dev

# Stop ngrok and uvicorn processes
stop-ngrok:
	@./stop-processes.sh

