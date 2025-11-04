from fastapi import FastAPI
from routes import router as iot_router

app = FastAPI(title="Firmware API", version="0.1.0")

# Include IoT router
app.include_router(iot_router)


@app.get("/")
async def root():
    return {"message": "Hello from firmware!"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
