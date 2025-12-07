import asyncio
import logging
import os
from fastapi import APIRouter, Header
from typing import List, Optional, Literal
from pydantic import BaseModel, Field

# Try to import GPIO library (only available on Raspberry Pi)
try:
    import RPi.GPIO as GPIO
    GPIO_AVAILABLE = True
except ImportError:
    GPIO_AVAILABLE = False
    logging.warning("RPi.GPIO not available - running in development mode without hardware control")

router = APIRouter()
logger = logging.getLogger(__name__)

# GPIO pin mapping: pump 1 = 4, pump 2 = 17, pump 3 = 27
GPIO_PIN_MAP = {1: 4, 2: 17, 3: 27}

# Try to load pump mapping from config file if it exists
# The config maps ingredient names to GPIO pins, but we need pump1/pump2/pump3 -> GPIO
# We'll use the pump_mapping from the backend to map ingredients to pumps, then look up GPIO
try:
    import json
    config_path = os.path.join(os.path.dirname(__file__), "..", "backend", "config", "pi_mapping.json")
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            config = json.load(f)
            # Store ingredient -> GPIO mapping from config
            INGREDIENT_TO_GPIO = config.get("pumps", {})
            logger.debug(f"Loaded GPIO mapping from config: {INGREDIENT_TO_GPIO}")
except Exception as e:
    logger.debug(f"Could not load pump config: {e}, using defaults")
    INGREDIENT_TO_GPIO = {}

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


class PourStep(BaseModel):
    """A single pump step with pump ID and ratio percentage."""
    pump_id: int = Field(..., ge=1, le=3, description="Pump ID (1, 2, or 3)")
    ratio: int = Field(..., ge=0, le=100, description="Percentage ratio (0-100)")


class DrinkRequest(BaseModel):
    """Simplified pour request with list of pump steps."""
    steps: List[PourStep] = Field(..., min_items=1, description="List of pump steps to execute")


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
    Receive a simplified pour request with pump steps.
    
    This endpoint accepts pour requests with a list of pump_id and ratio pairs.
    All pumps run simultaneously, each for a duration based on its ratio.
    Base duration: 100% = 5 seconds, so ratio% = (ratio / 100) * 5 seconds.
    """
    # Flicker onboard LED to indicate request received
    logger.info(f"Received pour request with {len(request.steps)} steps")
    await flicker_onboard_led(times=3, duration=0.1)
    
    # Base duration: 100% = 5 seconds
    BASE_DURATION_SECONDS = 5.0
    
    if not GPIO_AVAILABLE:
        logger.warning("GPIO not available - simulating pour action")
        step_summary = ", ".join([f"pump {s.pump_id} ({s.ratio}%)" for s in request.steps])
        return DrinkResponse(
            status="ok",
            message=f"GPIO not available (development mode). Would dispense: {step_summary}",
        )
    
    try:
        GPIO.setmode(GPIO.BCM)
        
        # Get all unique GPIO pins we need to control
        pins_to_control = set()
        pump_tasks = []
        
        for step in request.steps:
            if step.pump_id not in GPIO_PIN_MAP:
                logger.warning(f"Invalid pump_id: {step.pump_id}. Must be 1, 2, or 3. Skipping.")
                continue
            
            gpio_pin = GPIO_PIN_MAP[step.pump_id]
            duration = (step.ratio / 100.0) * BASE_DURATION_SECONDS
            
            if duration > 0:
                pins_to_control.add(gpio_pin)
                
                # Create task for this pump (capture variables to avoid closure issues)
                async def run_pump(pin: int, pump_id: int, ratio: int, dur: float):
                    """Run a single pump for the specified duration."""
                    GPIO.setup(pin, GPIO.OUT)
                    GPIO.output(pin, GPIO.LOW)  # Start off
                    logger.info(f"Starting pump {pump_id} ({ratio}%) on GPIO pin {pin} for {dur:.2f} seconds")
                    GPIO.output(pin, GPIO.HIGH)
                    await asyncio.sleep(dur)
                    GPIO.output(pin, GPIO.LOW)
                    logger.info(f"Stopped pump {pump_id} on GPIO pin {pin}")
                
                pump_tasks.append(run_pump(gpio_pin, step.pump_id, step.ratio, duration))
        
        if pump_tasks:
            # Run all pumps simultaneously
            logger.info(f"Running {len(pump_tasks)} pumps simultaneously")
            await asyncio.gather(*pump_tasks)
            
            # Clean up all pins
            for pin in pins_to_control:
                try:
                    GPIO.cleanup(pin)
                except Exception:
                    pass
            
            step_summary = ", ".join([f"pump {s.pump_id} ({s.ratio}%)" for s in request.steps])
            return DrinkResponse(
                status="ok",
                message=f"Successfully dispensed via {step_summary}.",
            )
        else:
            logger.warning("No valid pump steps to execute")
            return DrinkResponse(
                status="error",
                message="No valid pump steps to execute.",
            )
    except Exception as e:
        logger.error(f"Error controlling GPIO: {str(e)}")
        # Clean up GPIO on error - ensure pins are turned off
        try:
            if GPIO_AVAILABLE:
                # Try to turn off all pins we might have used
                for pin in GPIO_PIN_MAP.values():
                    try:
                        GPIO.output(pin, GPIO.LOW)
                    except Exception:
                        pass
                GPIO.cleanup()
        except Exception:
            pass
        return DrinkResponse(
            status="error",
            message=f"Failed to control GPIO: {str(e)}",
        )

