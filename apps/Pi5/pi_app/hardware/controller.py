from __future__ import annotations

import asyncio
import atexit
import json
import logging
import threading
import time
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, ConfigDict

logger = logging.getLogger(__name__)

try:  # pragma: no cover - executed on Raspberry Pi
    import RPi.GPIO as GPIO  # type: ignore
except Exception:  # pragma: no cover - non Pi development
    GPIO = None  # type: ignore


class PumpDefaults(BaseModel):
    """Default safety and timing configuration loaded from pi_mapping.json."""

    prime_time_seconds: float = Field(default=1.5, gt=0)
    post_dispense_delay_seconds: float = Field(default=0.5, ge=0)
    max_run_seconds: float = Field(default=20, gt=0)
    cooldown_seconds: float = Field(default=1.0, ge=0)


class PumpCalibration(BaseModel):
    model_config = ConfigDict(extra="allow")

    correction_factor: float = Field(default=1.0, gt=0)
    last_calibrated: str | None = None


class PumpMapping(BaseModel):
    """Complete pump mapping parsed from pi_mapping.json."""

    model_config = ConfigDict(extra="allow")

    pumps: dict[str, int]
    flow_rates_ml_per_second: dict[str, float] = Field(default_factory=dict)
    defaults: PumpDefaults = Field(default_factory=PumpDefaults)
    calibration: dict[str, PumpCalibration] = Field(default_factory=dict)

    def get_flow_rate(self, pump: str) -> float | None:
        return self.flow_rates_ml_per_second.get(pump)

    def get_correction_factor(self, pump: str) -> float:
        data = self.calibration.get(pump)
        return data.correction_factor if data else 1.0

    def get_pin(self, pump: str) -> int:
        if pump not in self.pumps:
            raise ValueError(f"Unknown pump '{pump}' in mapping")
        return int(self.pumps[pump])


def load_pump_mapping(path: Path) -> PumpMapping:
    """Load mapping JSON and return a validated PumpMapping instance."""
    if not path.exists():
        raise FileNotFoundError(f"pi_mapping.json not found at {path}")

    data = json.loads(path.read_text(encoding="utf-8"))
    return PumpMapping.model_validate(data)


class PumpController:
    """Controls GPIO pins and simulates behavior when not on Raspberry Pi."""

    def __init__(self, mapping: PumpMapping):
        self.mapping = mapping
        self._hardware_available = GPIO is not None
        self._lock = threading.RLock()
        self._cooldowns: dict[str, float] = {}

        if self._hardware_available:
            GPIO.setmode(GPIO.BCM)
            for pin in self.mapping.pumps.values():
                GPIO.setup(pin, GPIO.OUT)
                GPIO.output(pin, GPIO.LOW)
            logger.info("Pump controller initialised with GPIO support")
        else:
            logger.warning("RPi.GPIO not available - running in simulation mode")

        atexit.register(self.cleanup)

    @property
    def hardware_available(self) -> bool:
        return self._hardware_available

    async def dispense(self, pump: str, seconds: float) -> dict[str, Any]:
        """Run a pump for the provided duration asynchronously."""
        self._validate_seconds(seconds)
        pin = self.mapping.get_pin(pump)

        result = await asyncio.to_thread(self._run_pump, pump, pin, seconds)
        return result

    async def prime(self, pump: str, seconds: float | None = None) -> dict[str, Any]:
        """Prime a pump using defaults if no duration is provided."""
        duration = seconds or self.mapping.defaults.prime_time_seconds
        return await self.dispense(pump, duration)

    async def run_steps(
        self,
        steps: list[dict[str, Any]],
        pause_between: float,
    ) -> list[dict[str, Any]]:
        """Execute a set of normalized steps sequentially."""
        results: list[dict[str, Any]] = []
        for idx, step in enumerate(steps, start=1):
            pump = step["pump"]
            seconds = float(step["seconds"])
            description = step.get("description")

            logger.info(
                "Step %s/%s: pump=%s seconds=%.2f %s",
                idx,
                len(steps),
                pump,
                seconds,
                f"desc={description}" if description else "",
            )

            result = await self.dispense(pump, seconds)
            result["description"] = description
            results.append(result)

            if pause_between > 0 and idx < len(steps):
                await asyncio.sleep(pause_between)

        return results

    def _validate_seconds(self, seconds: float) -> None:
        max_run = self.mapping.defaults.max_run_seconds
        if seconds <= 0:
            raise ValueError("Dispense duration must be greater than zero")
        if max_run and seconds > max_run:
            raise ValueError(
                f"Requested duration {seconds}s exceeds safety limit {max_run}s"
            )

    def _respect_cooldown(self, pump: str) -> None:
        cooldown = self.mapping.defaults.cooldown_seconds
        if cooldown <= 0:
            return

        now = time.monotonic()
        last_run = self._cooldowns.get(pump)
        if last_run is None:
            return

        elapsed = now - last_run
        remaining = cooldown - elapsed
        if remaining > 0:
            logger.debug("Cooling down pump '%s' for %.2fs", pump, remaining)
            time.sleep(remaining)

    def _run_pump(self, pump: str, pin: int, seconds: float) -> dict[str, Any]:
        with self._lock:
            self._respect_cooldown(pump)
            start = time.monotonic()

            if self._hardware_available:
                GPIO.output(pin, GPIO.HIGH)
                time.sleep(seconds)
                GPIO.output(pin, GPIO.LOW)
            else:
                time.sleep(seconds)

            self._cooldowns[pump] = time.monotonic()

        mode = "hardware" if self._hardware_available else "simulation"
        return {
            "pump": pump,
            "pin": pin,
            "seconds": seconds,
            "mode": mode,
            "started_at": start,
        }

    def cleanup(self) -> None:
        with self._lock:
            if self._hardware_available and GPIO is not None:
                for pin in self.mapping.pumps.values():
                    GPIO.output(pin, GPIO.LOW)
                GPIO.cleanup()
                logger.info("GPIO resources cleaned up")

    def summary(self) -> dict[str, Any]:
        """Return mapping summary used by health endpoints."""
        return {
            "pumps": self.mapping.pumps,
            "flow_rates": self.mapping.flow_rates_ml_per_second,
            "defaults": self.mapping.defaults.model_dump(),
        }

