from fastapi import FastAPI
from id_scanning.routes import router as id_scanning_router

app = FastAPI()

# Include your routers here
app.include_router(id_scanning_router)

# You can add more routers or endpoints as needed

@app.get("/")
def read_root():
    return {"message": "Bartender Boys API is running!"}
