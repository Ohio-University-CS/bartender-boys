import json
import logging
import os
import random
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Optional

import httpx

from settings import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class HardwareDefaults:
    target_volume_ml: float
    prime_time_seconds: float
    post_dispense_delay_seconds: float
    max_run_seconds: float
    cooldown_seconds: float
    active_low: bool
    fallback_flow_rate_ml_per_second: float


@dataclass(frozen=True)
class PumpConfig:
    id: str
    label: str
    gpio_pin: int
    flow_rate_ml_per_second: float
    correction_factor: float
    liquid: Optional[str]
    last_calibrated: Optional[str]

    @property
    def adjusted_flow_rate(self) -> float:
        rate = self.flow_rate_ml_per_second * self.correction_factor
        return max(rate, 0.1)


@dataclass(frozen=True)
class PumpSelection:
    pump: PumpConfig
    defaults: HardwareDefaults
    target_volume_ml: float
    duration_seconds: float

    @property
    def prime_seconds(self) -> float:
        return self.defaults.prime_time_seconds

    @property
    def post_dispense_delay_seconds(self) -> float:
        return self.defaults.post_dispense_delay_seconds

    @property
    def cooldown_seconds(self) -> float:
        return self.defaults.cooldown_seconds

    def to_response_dict(self) -> Dict[str, Any]:
        return {
            "id": self.pump.id,
            "label": self.pump.label,
            "gpio_pin": self.pump.gpio_pin,
            "liquid": self.pump.liquid,
            "target_volume_ml": self.target_volume_ml,
        }


class HardwareProfile:
    """Represents the Raspberry Pi pump configuration."""

    def __init__(self, config: Dict[str, Any]):
        self.defaults = self._parse_defaults(config.get("defaults", {}))
        self.pumps = self._parse_pumps(config)
        if not self.pumps:
            raise ValueError("Pump configuration is empty. Check pi_mapping.json")

    def _parse_defaults(self, raw: Dict[str, Any]) -> HardwareDefaults:
        return HardwareDefaults(
            target_volume_ml=float(raw.get("target_volume_ml", 60.0)),
            prime_time_seconds=float(raw.get("prime_time_seconds", 0.0)),
            post_dispense_delay_seconds=float(
                raw.get("post_dispense_delay_seconds", 0.0)
            ),
            max_run_seconds=float(raw.get("max_run_seconds", 15.0)),
            cooldown_seconds=float(raw.get("cooldown_seconds", 0.0)),
            active_low=bool(raw.get("active_low", True)),
            fallback_flow_rate_ml_per_second=float(
                raw.get("fallback_flow_rate_ml_per_second", 10.0)
            ),
        )

    def _parse_pumps(self, config: Dict[str, Any]) -> list[PumpConfig]:
        pumps_section = config.get("pumps", {})
        if not isinstance(pumps_section, dict):
            raise ValueError("pumps section in pi_mapping.json must be an object")

        legacy_flow_rates = config.get("flow_rates_ml_per_second", {})
        legacy_calibration = config.get("calibration", {})

        parsed: list[PumpConfig] = []
        for pump_id, raw_value in pumps_section.items():
            raw: Dict[str, Any]
            if isinstance(raw_value, dict):
                raw = dict(raw_value)
            else:
                raw = {"gpio_pin": raw_value}

            if (
                isinstance(legacy_flow_rates, dict)
                and pump_id in legacy_flow_rates
                and "flow_rate_ml_per_second" not in raw
            ):
                raw["flow_rate_ml_per_second"] = legacy_flow_rates[pump_id]

            if isinstance(legacy_calibration, dict) and pump_id in legacy_calibration:
                calibration = legacy_calibration[pump_id]
                if isinstance(calibration, dict):
                    raw.setdefault(
                        "correction_factor", calibration.get("correction_factor", 1.0)
                    )
                    raw.setdefault(
                        "last_calibrated", calibration.get("last_calibrated")
                    )

            gpio_pin = int(raw.get("gpio_pin"))
            label = raw.get("label") or pump_id.replace("_", " ").title()
            flow_rate = float(
                raw.get(
                    "flow_rate_ml_per_second",
                    self.defaults.fallback_flow_rate_ml_per_second,
                )
            )
            correction_factor = float(raw.get("correction_factor", 1.0))
            liquid = raw.get("liquid") or label
            last_calibrated = raw.get("last_calibrated")

            parsed.append(
                PumpConfig(
                    id=pump_id,
                    label=label,
                    gpio_pin=gpio_pin,
                    flow_rate_ml_per_second=flow_rate,
                    correction_factor=correction_factor,
                    liquid=liquid,
                    last_calibrated=last_calibrated,
                )
            )

        return parsed

    def choose_random_pump(
        self, target_volume_ml: Optional[float] = None
    ) -> PumpSelection:
        pump = random.choice(self.pumps)
        volume = float(target_volume_ml or self.defaults.target_volume_ml)

        flow_rate = (
            pump.adjusted_flow_rate or self.defaults.fallback_flow_rate_ml_per_second
        )
        run_time = (
            volume / flow_rate if flow_rate > 0 else self.defaults.max_run_seconds
        )
        run_time = min(run_time, self.defaults.max_run_seconds)

        logger.info(
            "Selected pump %s (%s) on GPIO %s for %.2fs (target %.1f ml)",
            pump.id,
            pump.label,
            pump.gpio_pin,
            run_time,
            volume,
        )

        return PumpSelection(
            pump=pump,
            defaults=self.defaults,
            target_volume_ml=volume,
            duration_seconds=run_time,
        )


def _resolve_config_path() -> Path:
    env_path = os.getenv("PI_MAPPING_PATH")
    if env_path:
        return Path(env_path).expanduser().resolve()
    return Path(__file__).resolve().parent.parent / "config" / "pi_mapping.json"


@lru_cache(maxsize=1)
def get_hardware_profile() -> HardwareProfile:
    config_path = _resolve_config_path()
    try:
        with config_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except FileNotFoundError as exc:
        raise RuntimeError(
            f"Pi mapping configuration not found at {config_path}."
        ) from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Invalid JSON in pi mapping configuration at {config_path}: {exc}"
        ) from exc

    return HardwareProfile(data)


def build_firmware_command(drink: dict) -> Dict[str, Any]:
    """Build simplified firmware command from drink with ratios and pump mapping.

    Args:
        drink: Drink dict with ratios and pump_mapping

    Returns:
        Simplified payload with steps: [{"pump_id": 1, "ratio": 50}, ...]
    """
    import re

    def normalize_to_snake_case(text: str) -> str:
        """Normalize a string to snake_case (matching pump_config.py)."""
        if not text:
            return ""
        text = text.lower().strip()
        text = re.sub(r"[^\w\s-]", "", text)
        text = re.sub(r"[\s-]+", "_", text)
        text = text.strip("_")
        return text

    steps = []

    # Extract ratios and pump_mapping from drink
    ratios = drink.get("ratios", [])
    pump_mapping = drink.get("pump_mapping", {})
    ingredients = drink.get("ingredients", [])

    # Map pump names (pump1, pump2, pump3) to pump IDs (1, 2, 3)
    pump_name_to_id = {"pump1": 1, "pump2": 2, "pump3": 3}

    # Build steps from ingredients and ratios
    for i, ingredient in enumerate(ingredients):
        if i >= len(ratios):
            break

        ratio = ratios[i]
        if ratio <= 0:
            continue

        # Find which pump this ingredient is mapped to (using same normalization as routes.py)
        normalized_ingredient = normalize_to_snake_case(ingredient)
        pump_name = pump_mapping.get(normalized_ingredient)

        if pump_name and pump_name in pump_name_to_id:
            pump_id = pump_name_to_id[pump_name]
            steps.append(
                {
                    "pump_id": pump_id,
                    "ratio": ratio,
                }
            )

    if not steps:
        raise ValueError(
            "No valid pump steps could be generated from drink ratios and pump mapping"
        )

    return {
        "steps": steps,
    }


class FirmwareClient:
    """Client for communicating with the firmware API."""

    def __init__(self, base_url: Optional[str] = None, token: Optional[str] = None):
        self.base_url = base_url or settings.FIRMWARE_API_URL
        self.token = token or settings.FIRMWARE_API_TOKEN
        if not self.base_url:
            raise ValueError("FIRMWARE_API_URL must be set in environment variables")

    def _auth_headers(self) -> dict[str, str]:
        """Build headers for firmware auth (supports token or Bearer)."""
        if not self.token:
            return {}
        return {
            "X-Firmware-Token": self.token,
            "Authorization": f"Bearer {self.token}",
        }

    async def send_drink_request(self, payload: dict) -> dict:
        """
        Send a drink request to the firmware API.

        Args:
            payload: Command payload to forward to the firmware service

        Returns:
            Response from firmware API
        """
        url = f"{self.base_url.rstrip('/')}/iot/drink"
        headers = self._auth_headers()

        try:
            # Use a longer timeout to allow firmware to process the request
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Failed to send drink request to firmware: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error sending drink request: {e}")
            raise
