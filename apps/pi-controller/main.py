"""FastAPI service that controls Raspberry Pi pumps for the bartender project."""

from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

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


class PumpPayload(BaseModel):
    id: str
    label: str
    gpio_pin: int
    duration_seconds: float = Field(gt=0, description="Main dispense duration")
    prime_seconds: float = Field(default=0.0, ge=0.0)
    post_dispense_delay_seconds: float = Field(default=0.0, ge=0.0)
    cooldown_seconds: float = Field(default=0.0, ge=0.0)
    target_volume_ml: Optional[float] = Field(default=None, ge=0.0)
    liquid: Optional[str] = None
    flow_rate_ml_per_second: Optional[float] = Field(default=None, ge=0.0)
    active_low: Optional[bool] = None
    correction_factor: Optional[float] = Field(default=None, ge=0.0)
    last_calibrated: Optional[str] = None


class PourRequest(BaseModel):
    drink: Dict[str, Any]
    pump: PumpPayload


class PourResponse(BaseModel):
    status: str
    message: str
    selected_pump: Dict[str, Any]
    timing: Dict[str, float]


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
        self._pumps: Dict[str, Dict[str, Any]] = {}

        pumps_section = config.get("pumps", {})
        if not isinstance(pumps_section, dict):
            raise RuntimeError("pumps section in pi_mapping.json must be an object")

        for pump_id, raw in pumps_section.items():
            if isinstance(raw, dict):
                pin = int(raw.get("gpio_pin"))
                label = raw.get("label") or pump_id.replace("_", " ").title()
            else:
                pin = int(raw)
                label = pump_id.replace("_", " ").title()
            self._pumps[pump_id] = {"gpio_pin": pin, "label": label}

        if not self._pumps:
            raise RuntimeError("No pumps defined in configuration")

        if self.simulate:
            self._engaged_level = 0
            self._inactive_level = 1
            logger.info("Pump controller initialised in SIMULATION mode")
        else:
            assert GPIO is not None  # nosec - guarded above
            GPIO.setmode(GPIO.BCM)
            self._engaged_level = GPIO.LOW if self.active_low else GPIO.HIGH
            self._inactive_level = GPIO.HIGH if self.active_low else GPIO.LOW
            for pump in self._pumps.values():
                GPIO.setup(pump["gpio_pin"], GPIO.OUT, initial=self._inactive_level)
            logger.info("Pump controller initialised with real GPIO access")

    def cleanup(self) -> None:
        if self.simulate:
            return
        assert GPIO is not None  # nosec
        for pump in self._pumps.values():
            GPIO.output(pump["gpio_pin"], self._inactive_level)
        GPIO.cleanup()
        logger.info("GPIO cleaned up")

    def _require_pump(self, payload: PumpPayload) -> Dict[str, Any]:
        pump_cfg = self._pumps.get(payload.id)
        if not pump_cfg:
            raise HTTPException(status_code=400, detail=f"Unknown pump id {payload.id}")
        if pump_cfg["gpio_pin"] != payload.gpio_pin:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"GPIO pin mismatch for pump {payload.id}: expected "
                    f"{pump_cfg['gpio_pin']} got {payload.gpio_pin}"
                ),
            )
        return pump_cfg

    async def start_dispense(self, payload: PumpPayload) -> Dict[str, float]:
        pump_cfg = self._require_pump(payload)

        prime = max(payload.prime_seconds, 0.0)
        duration = max(payload.duration_seconds, 0.0)
        if prime + duration <= 0:
            raise HTTPException(status_code=400, detail="Dispense duration must be positive")

        allowed_duration = max(self.max_run_seconds - prime, 0.0)
        if allowed_duration <= 0:
            raise HTTPException(
                status_code=400,
                detail="Prime time exceeds maximum run seconds configured",
            )
        if duration > allowed_duration:
            logger.warning(
                "Requested duration %.2fs exceeds limit; clamping to %.2fs",
                duration,
                allowed_duration,
            )
            duration = allowed_duration

        post_delay = max(payload.post_dispense_delay_seconds, 0.0)
        cooldown = max(payload.cooldown_seconds, self.default_cooldown, 0.0)

        if self._lock.locked():
            raise HTTPException(status_code=409, detail="Pump controller is busy")

        asyncio.create_task(
            self._dispense_task(
                pump_cfg["gpio_pin"],
                pump_cfg["label"],
                prime,
                duration,
                post_delay,
                cooldown,
            )
        )

        return {
            "prime_seconds": prime,
            "duration_seconds": duration,
            "post_dispense_delay_seconds": post_delay,
            "cooldown_seconds": cooldown,
        }

    async def _dispense_task(
        self,
        gpio_pin: int,
        label: str,
        prime: float,
        duration: float,
        post_delay: float,
        cooldown: float,
    ) -> None:
        async with self._lock:
            logger.info(
                "Starting dispense on %s (GPIO %s) | prime=%.2fs | duration=%.2fs",
                label,
                gpio_pin,
                prime,
                duration,
            )
            self._set_gpio(gpio_pin, True)
            try:
                if prime > 0:
                    await asyncio.sleep(prime)
                if duration > 0:
                    await asyncio.sleep(duration)
            finally:
                self._set_gpio(gpio_pin, False)
                logger.info("Stopped dispense on %s", label)
            if post_delay > 0:
                await asyncio.sleep(post_delay)
        if cooldown > 0:
            logger.info("Cooldown for %.2fs", cooldown)
            await asyncio.sleep(cooldown)

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

CONFIG = load_mapping_config()
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
    timing = await PUMP_CONTROLLER.start_dispense(request.pump)

    volume = request.pump.target_volume_ml
    if volume and volume > 0:
        message = f"Dispensing {volume:.0f} ml via {request.pump.label}."
    else:
        message = f"Dispensing via {request.pump.label}."

    selected_pump = {
        "id": request.pump.id,
        "label": request.pump.label,
        "gpio_pin": request.pump.gpio_pin,
        "liquid": request.pump.liquid,
        "target_volume_ml": request.pump.target_volume_ml,
    }

    return PourResponse(
        status="ok",
        message=message,
        selected_pump=selected_pump,
        timing=timing,
    )


if __name__ == "__main__":  # pragma: no cover - manual execution
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("PI_CONTROLLER_HOST", "0.0.0.0"),
        port=int(os.getenv("PI_CONTROLLER_PORT", "9000")),
        reload=False,
    )
