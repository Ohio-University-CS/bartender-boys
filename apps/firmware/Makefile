.PHONY: run dev

# Run the firmware backend normally (no reload)
run:
	uv run uvicorn main:app --host 0.0.0.0 --port 8001

# Run the firmware backend with hot reload
dev:
	uv run uvicorn main:app --reload --host 0.0.0.0 --port 8001

