"""Utilities for communicating with the external drink dispenser controller."""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List

import httpx

from settings import settings


class DispenserService:
    """HTTP client wrapper for the Raspberry Pi drink dispenser."""

    def __init__(self) -> None:
        base = settings.PI_CONTROLLER_URL.strip()
        if not base:
            raise ValueError("PI_CONTROLLER_URL environment variable is required for dispenser operations")
        self.base_url = base.rstrip("/")

    async def _run_step(self, client: httpx.AsyncClient, pump: str, seconds: float) -> Dict[str, Any]:
        """Trigger a single pump for a number of seconds."""
        endpoint = f"{self.base_url}/dispense/{pump}"
        response = await client.post(endpoint, params={"seconds": seconds})
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            payload = {"raw": payload}
        payload.setdefault("pump", pump)
        payload.setdefault("seconds", seconds)
        return payload

    async def dispense_sequence(self, steps: List[Dict[str, Any]], pause_between: float = 0.0) -> List[Dict[str, Any]]:
        """Execute a sequence of dispense steps sequentially.

        Args:
            steps: List of {"pump": str, "seconds": float} dictionaries.
            pause_between: Optional pause in seconds between each step.
        """
        if not steps:
            raise ValueError("Dispense sequence requires at least one step")

        async with httpx.AsyncClient(timeout=30.0) as client:
            results: List[Dict[str, Any]] = []
            for item in steps:
                pump = item["pump"]
                seconds = float(item["seconds"])
                result = await self._run_step(client, pump, seconds)
                results.append(result)
                if pause_between > 0:
                    await asyncio.sleep(pause_between)
        return results


_dispenser_service: DispenserService | None = None


def get_dispenser_service() -> DispenserService:
    """Lazy initialise the dispenser service."""
    global _dispenser_service
    if _dispenser_service is None:
        _dispenser_service = DispenserService()
    return _dispenser_service
