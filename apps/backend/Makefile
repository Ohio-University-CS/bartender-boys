.PHONY: run dev

# Run the backend normally (no reload)
run:
	uv run uvicorn main:app --host 0.0.0.0 --port 8000

# Run the backend with hot reload
dev:
	uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000


