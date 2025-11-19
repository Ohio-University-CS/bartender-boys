from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any

import httpx

from ..config import settings

logger = logging.getLogger(__name__)


class HeartbeatService:
    """Periodically pushes telemetry to the backend when configured."""

    def __init__(self, state_supplier: Callable[[], Awaitable[dict[str, Any]] | dict[str, Any]]):
        self._state_supplier = state_supplier
        self._task: asyncio.Task | None = None
        self._stop_event = asyncio.Event()

    async def start(self) -> None:
        if not settings.backend_heartbeat_url:
            logger.info("Heartbeat URL not configured - skipping background task")
            return
        if self._task and not self._task.done():
            return

        self._stop_event.clear()
        self._task = asyncio.create_task(self._runner())
        logger.info(
            "Heartbeat service started; posting to %s every %ss",
            settings.backend_heartbeat_url,
            settings.heartbeat_interval_seconds,
        )

    async def stop(self) -> None:
        if self._task:
            self._stop_event.set()
            await self._task
            self._task = None

    async def _runner(self) -> None:
        async with httpx.AsyncClient(timeout=10.0) as client:
            while not self._stop_event.is_set():
                await self._publish_once(client)
                try:
                    await asyncio.wait_for(
                        self._stop_event.wait(),
                        timeout=settings.heartbeat_interval_seconds,
                    )
                except asyncio.TimeoutError:
                    continue

    async def _publish_once(self, client: httpx.AsyncClient) -> None:
        if not settings.backend_heartbeat_url:
            return

        payload = await self._collect_payload()
        headers = {}
        if settings.heartbeat_auth_token:
            headers["Authorization"] = f"Bearer {settings.heartbeat_auth_token}"

        try:
            response = await client.post(
                str(settings.backend_heartbeat_url),
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            logger.debug("Heartbeat sent: %s", payload)
        except Exception as exc:
            logger.warning("Failed to push heartbeat: %s", exc)

    async def _collect_payload(self) -> dict[str, Any]:
        state = self._state_supplier()
        if asyncio.iscoroutine(state) or isinstance(state, Awaitable):
            state = await state  # type: ignore[assignment]

        payload = {
            "device_id": settings.telemetry_device_id,
            "state": state,
            "metadata": settings.extra_metadata,
        }
        return payload

