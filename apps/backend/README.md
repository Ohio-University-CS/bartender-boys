# Bartender Boys Backend

A FastAPI-based backend service for the Bartender Boys application, providing RESTful APIs and database connectivity.

## What This Backend Does

This backend service provides:
- **RESTful API endpoints** for the Bartender Boys frontend application
- **Health monitoring** with health check endpoints
- **CORS support** for cross-origin requests from the frontend
- **MongoDB integration** using PyMongo for data persistence
- **Interactive API documentation** with Swagger UI and ReDoc

## Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) package manager

## Installation

1. Navigate to the backend directory:
   ```bash
   cd apps/backend
   ```

2. Install dependencies using uv:
   ```bash
   uv sync
   ```

## Running the Application

### Development Mode (with auto-reload)

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Simple Run

```bash
uv run main.py
```

### Production Mode

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

Once running, the API will be available at:

- **Base URL**: `http://localhost:8000`
- **Root**: `GET /` - Welcome message
- **Health Check**: `GET /health` - Service health status
- **API Documentation**: `GET /docs` - Interactive Swagger UI
- **Alternative Docs**: `GET /redoc` - ReDoc documentation

## Development

### Installing Development Dependencies

```bash
uv sync --extra dev
```

### Code Formatting and Linting

```bash
uv run ruff check .          # Check for linting issues
uv run ruff check --fix .    # Auto-fix linting issues
uv run ruff format .         # Format code
```

## Project Structure

```
apps/backend/
├── main.py              # FastAPI application entry point
├── pyproject.toml       # Project configuration and dependencies
├── README.md           # This file
└── uv.lock             # Dependency lock file
```

## Configuration

The application runs on:
- **Host**: `0.0.0.0` (all interfaces)
- **Port**: `8000`
- **CORS**: Currently allows all origins (configure for production)

## Dependencies

### Core Dependencies
- `fastapi` - Modern web framework for building APIs
- `uvicorn[standard]` - ASGI server for running FastAPI
- `pymongo` - MongoDB driver for Python

### Development Dependencies
- `pytest` - Testing framework
- `pytest-asyncio` - Async testing support
- `httpx` - HTTP client for testing
- `ruff` - Fast Python linter and formatter
