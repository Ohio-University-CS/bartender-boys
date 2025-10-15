from fastapi import APIRouter

router = APIRouter()

@router.get("/id-scan")
def scan_id():
    return {"message": "ID scanning endpoint is working!"}
