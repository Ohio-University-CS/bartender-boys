import asyncio
import logging
from fastapi import APIRouter, Header
from typing import Optional, Literal
from pydantic import BaseModel

# Try to import GPIO library (only available on Raspberry Pi)
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    GPIO_AVAILABLE = False
    logging.warning("RPi.GPIO not available - running in development mode without hardware control")

router = APIRouter()
logger = logging.getLogger(__name__)

# GPIO pin to control (using pin 17 as default, can be configured)
GPIO_PIN = 17


class DrinkRequest(BaseModel):
    """Request model for drink dispense."""
    drink: dict


class DrinkResponse(BaseModel):
    """Response model for drink dispense."""
    status: Literal["ok", "error"]
    message: str


@router.post("/iot/drink", response_model=DrinkResponse)
async def receive_drink_request(
    request: DrinkRequest,
    x_firmware_token: Optional[str] = Header(None, alias="X-Firmware-Token"),
    authorization: Optional[str] = Header(None),
):
    """
    Receive a drink request from the backend.
    
    This endpoint accepts pour requests from the backend and processes them
    for hardware dispense. Turns on a GPIO pin for 1 second, then turns it off.
    """
    drink = request.drink
    drink_name = drink.get("name", "Unknown drink")
    
    if not GPIO_AVAILABLE:
        logger.warning("GPIO not available - simulating pour action")
        return DrinkResponse(
            status="ok",
            message=f"Received drink request for {drink_name}. GPIO not available (development mode).",
        )
    
    try:
        # Set up GPIO
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(GPIO_PIN, GPIO.OUT)
        
        # Turn on GPIO pin
        logger.info(f"Turning on GPIO pin {GPIO_PIN} for {drink_name}")
        GPIO.output(GPIO_PIN, GPIO.HIGH)
        
        # Wait for 1 second
        await asyncio.sleep(1.0)
        
        # Turn off GPIO pin
        logger.info(f"Turning off GPIO pin {GPIO_PIN}")
        GPIO.output(GPIO_PIN, GPIO.LOW)
        
        # Clean up GPIO
        GPIO.cleanup(GPIO_PIN)
        
        return DrinkResponse(
            status="ok",
            message=f"Successfully dispensed {drink_name} (GPIO pin {GPIO_PIN} activated for 1 second).",
        )
    except Exception as e:
        logger.error(f"Error controlling GPIO: {str(e)}")
        # Clean up GPIO on error
        try:
            if GPIO_AVAILABLE:
                GPIO.cleanup(GPIO_PIN)
        except Exception:
            pass
        return DrinkResponse(
            status="error",
            message=f"Failed to control GPIO: {str(e)}",
        )

