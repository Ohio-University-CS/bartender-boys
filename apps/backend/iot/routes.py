import logging
import httpx
from fastapi import APIRouter, HTTPException
from .models import PourRequest, PourResponse
from .utils import FirmwareClient
from settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/iot", tags=["IoT"])

_firmware_client: FirmwareClient | None = None


def get_firmware_client() -> FirmwareClient:
    """Get or create the firmware client instance."""
    global _firmware_client
    if _firmware_client is None:
        try:
            _firmware_client = FirmwareClient()
        except ValueError as e:
            logger.error(f"Failed to initialize firmware client: {str(e)}")
            raise
    return _firmware_client


@router.post("/drink", response_model=PourResponse)
async def send_drink_to_firmware(request: PourRequest) -> PourResponse:
    """
    Send a drink request to the firmware API.
    
    Args:
        request: Drink request containing the drink object
        
    Returns:
        Response from firmware API
    """
    try:
        client = get_firmware_client()
    except ValueError as e:
        logger.error(f"Firmware client configuration error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Firmware API URL not configured. Set FIRMWARE_API_URL environment variable."
        )
    
    try:
        drink_dict = request.drink.dict()
        result = await client.send_drink_request(drink_dict)
        return PourResponse(**result)
    except httpx.HTTPError as e:
        logger.exception("Failed to send drink to firmware API")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to communicate with firmware API: {str(e)}"
        )
    except Exception as e:
        logger.exception("Unexpected error sending drink to firmware")
        raise HTTPException(
            status_code=500,
            detail=f"Error sending drink to firmware: {str(e)}"
        )

