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
- OpenAI API key (see setup instructions below)

## Setup

### 1. Environment Configuration

1. Navigate to the backend directory:
   ```bash
   cd apps/backend
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your configuration:
   ```bash
   # Open in your preferred editor
   nano .env
   # or
   code .env
   ```

### 2. Getting an OpenAI API Key

1. **Create an OpenAI Account**:
   - Go to [OpenAI's website](https://platform.openai.com/)
   - Sign up for an account or log in if you already have one

2. **Navigate to API Keys**:
   - Once logged in, go to the [API Keys page](https://platform.openai.com/api-keys)
   - Click "Create new secret key"

3. **Generate Your Key**:
   - Give your key a descriptive name (e.g., "Bartender Boys Development")
   - Copy the generated key immediately (you won't be able to see it again!)
   - ⚠️ **Important**: Keep this key secure and never commit it to version control

4. **Add Credits to Your Account**:
   - Go to the [Billing page](https://platform.openai.com/account/billing/overview)
   - Add payment method and credits (OpenAI charges per API call)
   - For development, $5-10 should be plenty to get started

5. **Update Your .env File**:
   ```bash
   # Replace 'your_openai_api_key_here' with your actual API key
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### 3. Install Dependencies

Install dependencies using uv:
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

### Environment Variables

The application uses the following environment variables (configured in `.env`):

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | - | ✅ Yes |
| `HOST` | Server host | `0.0.0.0` | No |
| `PORT` | Server port | `8000` | No |
| `DEBUG` | Enable debug mode | `false` | No |
| `CORS_ORIGINS` | Allowed CORS origins | `*` | No |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o` | No |
| `OPENAI_MAX_TOKENS` | Max tokens per request | `500` | No |
| `OPENAI_TEMPERATURE` | Model temperature | `0.1` | No |
| `MAX_IMAGE_SIZE_MB` | Max image size for ID scanning | `10` | No |

### Security Notes

- ⚠️ **Never commit your `.env` file to version control**
- The `.env` file is already included in `.gitignore`
- Keep your OpenAI API key secure and don't share it
- Consider using different API keys for development and production

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
