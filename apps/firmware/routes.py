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

# Mapping of pump names to GPIO pins
# Default mapping - can be configured via environment or config file
PUMP_TO_GPIO = {
    "pump1": 17,  # Default GPIO pin for pump1
    "pump2": 27,  # Default GPIO pin for pump2
    "pump3": 22,  # Default GPIO pin for pump3
}

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
    for hardware dispense. If hardware_steps are provided, runs multiple pumps
    simultaneously based on ratios. Otherwise, uses default single pump behavior.
    """
    drink = request.drink
    drink_name = drink.get("name", "Unknown drink")
    hardware_steps = drink.get("hardwareSteps") or drink.get("hardware_steps")
    pump_mapping = drink.get("pump_mapping", {})  # ingredient -> pump mapping from backend
    
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
        GPIO.setmode(GPIO.BCM)
        
        # If hardware_steps are provided, use them for multi-pump dispense
        if hardware_steps:
            # Get all unique GPIO pins we need to control
            pins_to_control = set()
            pump_tasks = []
            
            for step in hardware_steps:
                pump_name = step.get("pump") or step.get("pump_name")
                seconds = step.get("seconds") or step.get("duration", 1.0)
                description = step.get("description", "")
                
                # Try to get GPIO pin: first from pump_mapping + ingredient, then from PUMP_TO_GPIO
                gpio_pin = None
                
                # If we have pump_mapping, try to find the ingredient and look up its GPIO pin
                if pump_mapping and description:
                    # Extract ingredient name from description (format: "Ingredient Name (50%)")
                    ingredient_part = description.split(" (")[0] if " (" in description else description
                    # Try to find this ingredient in pump_mapping (values are pump names)
                    for ingredient, mapped_pump in pump_mapping.items():
                        if mapped_pump == pump_name:
                            # Found the ingredient for this pump, look up GPIO from config
                            if ingredient in INGREDIENT_TO_GPIO:
                                gpio_pin = INGREDIENT_TO_GPIO[ingredient]
                                break
                
                # Fallback to direct pump name mapping
                if gpio_pin is None and pump_name in PUMP_TO_GPIO:
                    gpio_pin = PUMP_TO_GPIO[pump_name]
                
                if gpio_pin is not None:
                    pins_to_control.add(gpio_pin)
                    
                    # Create task for this pump (capture variables to avoid closure issues)
                    pin = gpio_pin
                    duration = seconds
                    pump = pump_name
                    desc = description
                    
                    async def run_pump():
                        """Run a single pump for the specified duration."""
                        GPIO.setup(pin, GPIO.OUT)
                        GPIO.output(pin, GPIO.LOW)  # Start off
                        logger.info(f"Starting pump {pump} ({desc}) on GPIO pin {pin} for {duration} seconds")
                        GPIO.output(pin, GPIO.HIGH)
                        await asyncio.sleep(duration)
                        GPIO.output(pin, GPIO.LOW)
                        logger.info(f"Stopped pump {pump} on GPIO pin {pin}")
                    
                    pump_tasks.append(run_pump())
                else:
                    logger.warning(f"Could not determine GPIO pin for pump {pump_name}, skipping step")
            
            if pump_tasks:
                # Run all pumps simultaneously
                logger.info(f"Running {len(pump_tasks)} pumps simultaneously for {drink_name}")
                await asyncio.gather(*pump_tasks)
                
                # Clean up all pins
                for pin in pins_to_control:
                    try:
                        GPIO.cleanup(pin)
                    except Exception:
                        pass
                
                pump_list = ", ".join([f"GPIO {PUMP_TO_GPIO[step.get('pump') or step.get('pump_name')]}" 
                                      for step in hardware_steps 
                                      if (step.get("pump") or step.get("pump_name")) in PUMP_TO_GPIO])
                return DrinkResponse(
                    status="ok",
                    message=f"Successfully dispensed {drink_name} ({len(pump_tasks)} pumps: {pump_list}).",
                )
            else:
                logger.warning(f"No valid pumps found in hardware_steps for {drink_name}")
                return DrinkResponse(
                    status="error",
                    message=f"Cannot dispense {drink_name}: no valid pumps found in hardware_steps.",
                )
        
        # If no hardware_steps provided, return error
        return DrinkResponse(
            status="error",
            message=f"Cannot dispense {drink_name}: no hardware_steps provided.",
        )
    except Exception as e:
        logger.error(f"Error controlling GPIO: {str(e)}")
        # Clean up GPIO on error - ensure pins are turned off
        try:
            if GPIO_AVAILABLE:
                # Try to turn off all pins we might have used
                for pin in PUMP_TO_GPIO.values():
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

