from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from id_scanning.routes import router as id_scanning_router

app = FastAPI(
    title="Bartender Boys API",
    description="Backend API for Bartender Boys application",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(id_scanning_router)

@app.get("/")
async def root():
    return {"message": "Hello from Bartender Boys API!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
