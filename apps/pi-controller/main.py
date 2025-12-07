"""FastAPI service that controls Raspberry Pi pumps for the bartender project."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:  # pragma: no cover - executed only on real Raspberry Pi
    import RPi.GPIO as GPIO  # type: ignore
except (ImportError, RuntimeError):  # pragma: no cover - development machines
    GPIO = None

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("pi-controller")

# ---------------------------------------------------------------------------
# Configuration loading
# ---------------------------------------------------------------------------


def _resolve_config_path() -> Path:
    env_path = os.getenv("PI_MAPPING_PATH")
    if env_path:
        return Path(env_path).expanduser().resolve()
    return Path(__file__).resolve().parent / "config" / "pi_mapping.json"


def load_mapping_config() -> Dict[str, Any]:
    config_path = _resolve_config_path()
    with config_path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    return data


# ---------------------------------------------------------------------------
# Pydantic models for requests / responses
# ---------------------------------------------------------------------------

# GPIO pin mapping: pump 1 = 4, pump 2 = 17, pump 3 = 27
GPIO_PIN_MAP = {1: 4, 2: 17, 3: 27}


class PourStep(BaseModel):
    """A single pump step with pump ID and ratio percentage."""
    pump_id: int = Field(..., ge=1, le=3, description="Pump ID (1, 2, or 3)")
    ratio: int = Field(..., ge=0, le=100, description="Percentage ratio (0-100)")


class PourRequest(BaseModel):
    """Simplified pour request with list of pump steps."""
    steps: List[PourStep] = Field(..., min_items=1, description="List of pump steps to execute")


class PourResponse(BaseModel):
    status: str
    message: str
    steps_executed: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# GPIO controller
# ---------------------------------------------------------------------------


class PumpController:
    def __init__(self, config: Dict[str, Any], simulate: bool = False) -> None:
        defaults = config.get("defaults", {})
        self.active_low: bool = bool(defaults.get("active_low", True))
        self.default_cooldown: float = float(defaults.get("cooldown_seconds", 0.0))
        self.max_run_seconds: float = float(defaults.get("max_run_seconds", 15.0))
        self.simulate: bool = simulate or (GPIO is None)
        self._lock: asyncio.Lock = asyncio.Lock()
        
        # Hardcoded GPIO pins: pump 1 = 4, pump 2 = 17, pump 3 = 27
        self._gpio_pins = GPIO_PIN_MAP.copy()

        if self.simulate:
            self._engaged_level = 0
            self._inactive_level = 1
            logger.info("Pump controller initialised in SIMULATION mode")
        else:
            assert GPIO is not None  # nosec - guarded above
            GPIO.setmode(GPIO.BCM)
            self._engaged_level = GPIO.LOW if self.active_low else GPIO.HIGH
            self._inactive_level = GPIO.HIGH if self.active_low else GPIO.LOW
            for pin in self._gpio_pins.values():
                GPIO.setup(pin, GPIO.OUT, initial=self._inactive_level)
            logger.info("Pump controller initialised with real GPIO access (pins: %s)", self._gpio_pins)

    def cleanup(self) -> None:
        if self.simulate:
            return
        assert GPIO is not None  # nosec
        for pin in self._gpio_pins.values():
            GPIO.output(pin, self._inactive_level)
        GPIO.cleanup()
        logger.info("GPIO cleaned up")

    async def start_multi_pump_dispense(self, steps: List[PourStep]) -> List[Dict[str, Any]]:
        """Start dispense for multiple pumps based on ratios.
        
        All pumps run simultaneously. Each pump runs for a duration based on its ratio.
        Base duration is 5 seconds, so ratio% = (ratio / 100) * 5 seconds.
        """
        if self._lock.locked():
            raise HTTPException(status_code=409, detail="Pump controller is busy")

        # Base duration: 100% = 5 seconds
        BASE_DURATION_SECONDS = 5.0
        
        # Calculate duration for each pump based on ratio
        pump_tasks = []
        steps_executed = []
        
        for step in steps:
            if step.pump_id not in self._gpio_pins:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid pump_id: {step.pump_id}. Must be 1, 2, or 3."
                )
            
            gpio_pin = self._gpio_pins[step.pump_id]
            duration = (step.ratio / 100.0) * BASE_DURATION_SECONDS
            
            # Clamp duration to max_run_seconds
            if duration > self.max_run_seconds:
                logger.warning(
                    "Pump %d duration %.2fs exceeds limit; clamping to %.2fs",
                    step.pump_id,
                    duration,
                    self.max_run_seconds,
                )
                duration = self.max_run_seconds
            
            if duration > 0:
                steps_executed.append({
                    "pump_id": step.pump_id,
                    "gpio_pin": gpio_pin,
                    "ratio": step.ratio,
                    "duration_seconds": duration,
                })
                pump_tasks.append(
                    self._single_pump_dispense_task(gpio_pin, step.pump_id, duration)
                )
        
        if not pump_tasks:
            raise HTTPException(status_code=400, detail="No valid pump steps to execute")

        # Start all pumps simultaneously
        asyncio.create_task(self._multi_pump_dispense_task(pump_tasks))
        
        return steps_executed

    async def _multi_pump_dispense_task(self, pump_tasks: List[asyncio.Task]) -> None:
        """Run multiple pump tasks concurrently."""
        async with self._lock:
            # Wait for all pumps to complete
            await asyncio.gather(*pump_tasks)
        
        # Cooldown after all pumps finish
        if self.default_cooldown > 0:
            logger.info("Cooldown for %.2fs", self.default_cooldown)
            await asyncio.sleep(self.default_cooldown)

    async def _single_pump_dispense_task(
        self,
        gpio_pin: int,
        pump_id: int,
        duration: float,
    ) -> None:
        """Dispense from a single pump for the specified duration."""
        logger.info(
            "Starting dispense on pump %d (GPIO %s) for %.2fs",
            pump_id,
            gpio_pin,
            duration,
        )
        self._set_gpio(gpio_pin, True)
        try:
            await asyncio.sleep(duration)
        finally:
            self._set_gpio(gpio_pin, False)
            logger.info("Stopped dispense on pump %d", pump_id)


    def _set_gpio(self, gpio_pin: int, active: bool) -> None:
        if self.simulate:
            logger.info(
                "[SIM] GPIO %s => %s",
                gpio_pin,
                "ACTIVE" if active else "INACTIVE",
            )
            return
        assert GPIO is not None  # nosec
        level = self._engaged_level if active else self._inactive_level
        GPIO.output(gpio_pin, level)


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

# Load config if available, but use defaults if not
try:
    CONFIG = load_mapping_config()
except Exception as e:
    logger.warning("Could not load config, using defaults: %s", e)
    CONFIG = {"defaults": {}}

SIMULATE = os.getenv("SIMULATE_GPIO", "0").lower() in {"1", "true", "yes", "on"}
PUMP_CONTROLLER = PumpController(CONFIG, simulate=SIMULATE)

app = FastAPI(title="Bartender Pump Controller", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
def _shutdown() -> None:
    PUMP_CONTROLLER.cleanup()


@app.get("/health")
async def health() -> Dict[str, Any]:  # pragma: no cover - simple endpoint
    return {"status": "ok", "simulate": SIMULATE}


@app.post("/iot/drink", response_model=PourResponse)
async def pour_drink(request: PourRequest) -> PourResponse:
    """Handle pour request with simplified step-based format."""
    steps_executed = await PUMP_CONTROLLER.start_multi_pump_dispense(request.steps)
    
    # Build message describing what was executed
    step_descriptions = [
        f"pump {s['pump_id']} ({s['ratio']}% for {s['duration_seconds']:.2f}s)"
        for s in steps_executed
    ]
    message = f"Dispensing via {', '.join(step_descriptions)}."

    return PourResponse(
        status="ok",
        message=message,
        steps_executed=steps_executed,
    )


if __name__ == "__main__":  # pragma: no cover - manual execution
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("PI_CONTROLLER_HOST", "0.0.0.0"),
        port=int(os.getenv("PI_CONTROLLER_PORT", "9000")),
        reload=False,
    )
