"""Pump control utilities for Raspberry Pi hardware."""

from __future__ import annotations

import asyncio
import atexit
import json
import logging
import os
import threading
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List

logger = logging.getLogger(__name__)

try:  # Prefer real GPIO and fall back to a no-op simulator during local dev.
    import RPi.GPIO as GPIO  # type: ignore
except ImportError:  # pragma: no cover - will execute on non-Pi systems.
    GPIO = None  # type: ignore


DEFAULT_MAPPING_PATH = (
    Path(__file__).resolve().parents[2] / "backend" / "config" / "pi_mapping.json"
)

_controller_instance: PumpController | None = None


def _load_mapping(mapping_path: Path) -> Dict[str, Any]:
    if not mapping_path.exists():
        raise FileNotFoundError(f"Pump mapping file not found: {mapping_path}")

    with mapping_path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)

    required_keys = {"pumps", "flow_rates_ml_per_second", "defaults"}
    missing = required_keys - set(data)
    if missing:
        raise ValueError(f"Pump mapping missing required keys: {sorted(missing)}")

    return data


class PumpController:
    """Controls physical (or simulated) pumps based on the mapping file."""

    def __init__(self, mapping: Dict[str, Any]):
        self.mapping = mapping
        self.pumps: Dict[str, int] = {k: int(v) for k, v in mapping["pumps"].items()}
        self.flow_rates = mapping.get("flow_rates_ml_per_second", {})
        self.defaults = mapping.get("defaults", {})
        self._hardware_available = GPIO is not None
        self._lock = threading.RLock()

        if self._hardware_available:
            GPIO.setmode(GPIO.BCM)
            for pin in self.pumps.values():
                GPIO.setup(pin, GPIO.OUT)
                GPIO.output(pin, GPIO.LOW)
            logger.info("Pump controller initialised with real GPIO support")
        else:
            logger.warning(
                "RPi.GPIO not available. Pump controller running in simulation mode"
            )

        atexit.register(self.cleanup)

    @property
    def hardware_available(self) -> bool:
        return self._hardware_available

    async def dispense_steps(
        self,
        steps: Iterable[Dict[str, Any]],
        pause_between: float | None = None,
    ) -> List[Dict[str, Any]]:
        pause = (
            pause_between
            if pause_between is not None
            else float(self.defaults.get("post_dispense_delay_seconds", 0.0))
        )
        max_run = float(self.defaults.get("max_run_seconds", 0)) or None

        results: List[Dict[str, Any]] = []
        for step in steps:
            pump_name = step["pump"]
            seconds = float(step["seconds"])
            if max_run and seconds > max_run:
                raise ValueError(
                    f"Requested run time {seconds}s exceeds safety limit {max_run}s"
                )

            result = await asyncio.to_thread(self._run_step, pump_name, seconds)
            results.append(result)

            if pause > 0:
                await asyncio.sleep(pause)

        return results

    def _run_step(self, pump_name: str, seconds: float) -> Dict[str, Any]:
        if pump_name not in self.pumps:
            raise ValueError(f"Unknown pump '{pump_name}' in dispense request")

        pin = self.pumps[pump_name]
        seconds = max(0.0, seconds)
        mode = "hardware" if self._hardware_available else "simulated"
        logger.info("Dispensing via pump '%s' (pin %s) for %.2f seconds", pump_name, pin, seconds)

        with self._lock:
            if self._hardware_available:
                GPIO.output(pin, GPIO.HIGH)
                time.sleep(seconds)
                GPIO.output(pin, GPIO.LOW)
            else:
                time.sleep(seconds)

        return {"pump": pump_name, "pin": pin, "seconds": seconds, "mode": mode}

    def cleanup(self) -> None:
        with self._lock:
            if self._hardware_available:
                for pin in self.pumps.values():
                    GPIO.output(pin, GPIO.LOW)
                GPIO.cleanup()
                logger.info("GPIO resources cleaned up")


def get_pump_controller() -> PumpController:
    global _controller_instance

    if _controller_instance is None:
        mapping_path = Path(os.environ.get("PI_MAPPING_PATH", DEFAULT_MAPPING_PATH))
        mapping = _load_mapping(mapping_path)
        _controller_instance = PumpController(mapping)

    return _controller_instance
