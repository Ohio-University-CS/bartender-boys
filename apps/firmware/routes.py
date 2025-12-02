import asyncio
import logging
import os
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

# GPIO pin to control (using pin 2 as default, can be configured)
GPIO_PIN = 2

# Onboard LED paths (varies by Pi model)
LED_PATHS = [
    "/sys/class/leds/led0/brightness",  # Older Pi models
    "/sys/class/leds/ACT/brightness",     # Pi 4 and newer
    "/sys/class/leds/PWR/brightness",    # Power LED (some models)
]


async def flicker_onboard_led(times: int = 3, duration: float = 0.1):
    """
    Flicker the onboard LED to indicate request received.
    
    Args:
        times: Number of times to flicker
        duration: Duration of each on/off cycle in seconds
    """
    led_path = None
    for path in LED_PATHS:
        if os.path.exists(path):
            led_path = path
            break
    
    if not led_path:
        logger.debug("Onboard LED not found - skipping LED flicker")
        return
    
    try:
        for _ in range(times):
            # Turn LED on
            with open(led_path, 'w') as f:
                f.write('1')
            await asyncio.sleep(duration)
            # Turn LED off
            with open(led_path, 'w') as f:
                f.write('0')
            await asyncio.sleep(duration)
    except (PermissionError, IOError) as e:
        logger.warning(f"Could not control onboard LED: {e}. May need to run with sudo or adjust permissions.")
    except Exception as e:
        logger.debug(f"LED flicker error (non-critical): {e}")


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
    
    # Flicker onboard LED to indicate request received
    logger.info(f"Received drink request for {drink_name}")
    await flicker_onboard_led(times=3, duration=0.1)
    
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
        
        # Initialize to LOW (off) to ensure pin starts in off state
        GPIO.output(GPIO_PIN, GPIO.LOW)
        
        # Turn on GPIO pin
        logger.info(f"Turning on GPIO pin {GPIO_PIN} for {drink_name}")
        GPIO.output(GPIO_PIN, GPIO.HIGH)
        
        # Wait for 1 second
        await asyncio.sleep(1.0)
        
        # Turn off GPIO pin (ensure it's off)
        logger.info(f"Turning off GPIO pin {GPIO_PIN}")
        GPIO.output(GPIO_PIN, GPIO.LOW)
        
        # Clean up GPIO (this also ensures pin is off)
        GPIO.cleanup(GPIO_PIN)
        
        return DrinkResponse(
            status="ok",
            message=f"Successfully dispensed {drink_name} (GPIO pin {GPIO_PIN} activated for 1 second).",
        )
    except Exception as e:
        logger.error(f"Error controlling GPIO: {str(e)}")
        # Clean up GPIO on error - ensure pin is turned off
        try:
            if GPIO_AVAILABLE:
                # Try to turn off the pin before cleanup
                try:
                    GPIO.output(GPIO_PIN, GPIO.LOW)
                except Exception:
                    pass
                GPIO.cleanup(GPIO_PIN)
        except Exception:
            pass
        return DrinkResponse(
            status="error",
            message=f"Failed to control GPIO: {str(e)}",
        )

