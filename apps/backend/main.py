from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from id_scanning.routes import router as id_scanning_router
from chat.routes import router as chat_router
from drinks.routes import router as drinks_router
from realtime.routes import router as realtime_router
from settings import settings
from services.db import connect_to_mongo, close_mongo_connection

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    try:
        yield
    finally:
        await close_mongo_connection()

app = FastAPI(
    title="Bartender Boys API",
    description="Backend API for Bartender Boys application",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware (configured for WebSocket and HTTP)
# If wildcard origins are used, credentials must be disabled.
cors_origins = settings.CORS_ORIGINS or ["*"]
allow_all = any(o.strip() == "*" for o in cors_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else [o.strip() for o in cors_origins],
    allow_credentials=False if allow_all else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(id_scanning_router)
app.include_router(chat_router)
app.include_router(drinks_router)
app.include_router(realtime_router)

@app.get("/")
async def root():
    return {"message": "Hello from Bartender Boys API!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
