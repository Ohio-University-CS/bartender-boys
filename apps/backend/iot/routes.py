import logging
import httpx
from fastapi import APIRouter
from .models import PourRequest, PourResponse
from .utils import FirmwareClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/iot", tags=["IoT"])

_firmware_client: FirmwareClient | None = None


def get_firmware_client() -> FirmwareClient | None:
    """Get or create the firmware client instance. Returns None if not configured."""
    global _firmware_client
    if _firmware_client is None:
        try:
            _firmware_client = FirmwareClient()
        except ValueError as e:
            logger.warning(f"Firmware client not configured: {str(e)}")
            return None
    return _firmware_client


@router.post("/pour", response_model=PourResponse)
async def send_drink_to_firmware(request: PourRequest) -> PourResponse:
    """
    Send a drink request to the firmware API.

    Args:
        request: Drink request containing the drink object

    Returns:
        Response from firmware API, or success response if firmware is unavailable
    """
    client = get_firmware_client()
    if client is None:
        logger.warning(
            "Firmware API URL not configured. Request will succeed without hardware dispense."
        )
        return PourResponse(
            status="ok",
            message="Firmware API not configured - request accepted but not dispensed",
        )

    try:
        drink_dict = request.drink.dict(by_alias=True, exclude_none=True)
        result = await client.send_drink_request(drink_dict)
        return PourResponse(**result)
    except httpx.HTTPError as e:
        logger.warning(
            f"Firmware API is unresponsive: {str(e)}. Request will succeed without hardware dispense."
        )
        return PourResponse(
            status="ok",
            message="Firmware API unresponsive - request accepted but not dispensed",
        )
    except Exception as e:
        logger.warning(
            f"Unexpected error communicating with firmware: {str(e)}. Request will succeed without hardware dispense."
        )
        return PourResponse(
            status="ok",
            message="Firmware communication error - request accepted but not dispensed",
        )
