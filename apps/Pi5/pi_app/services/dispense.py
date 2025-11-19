from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass
from typing import Iterable

from ..config import settings
from ..hardware import PumpController
from ..models import DispensePlan, DispenseResult, DispenseStep, Drink

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class NormalizedStep:
    pump: str
    seconds: float
    ml: float | None
    description: str | None


class DispenseManager:
    """High level orchestration over PumpController."""

    def __init__(self, controller: PumpController):
        self.controller = controller
        self._semaphore = asyncio.Semaphore(settings.max_parallel_jobs)
        self._state_lock = asyncio.Lock()
        self._queue_depth = 0
        self._current_run_id: str | None = None

    def _plan_from_drink(self, drink: Drink) -> DispensePlan:
        if drink.hardware_steps:
            return DispensePlan(steps=drink.hardware_steps)
        if drink.dispense:
            return drink.dispense
        raise ValueError(
            "Drink payload does not include hardwareSteps or dispense plan; "
            "the Pi cannot infer pump timings."
        )

    def normalize_steps(self, steps: Iterable[DispenseStep]) -> list[NormalizedStep]:
        normalized: list[NormalizedStep] = []
        for step in steps:
            seconds = self._resolve_seconds(step)
            normalized.append(
                NormalizedStep(
                    pump=step.pump,
                    seconds=seconds,
                    ml=step.ml,
                    description=step.description,
                )
            )
        return normalized

    def _resolve_seconds(self, step: DispenseStep) -> float:
        defaults = self.controller.mapping.defaults
        if step.prime:
            return defaults.prime_time_seconds
        if step.seconds:
            return step.seconds
        if step.ml:
            flow_rate = self.controller.mapping.get_flow_rate(step.pump)
            if not flow_rate:
                raise ValueError(
                    f"Pump '{step.pump}' is missing flow rate info for ml-based step"
                )
            correction = self.controller.mapping.get_correction_factor(step.pump)
            return step.ml / (flow_rate * correction)
        raise ValueError(
            f"Step for pump '{step.pump}' must include seconds or ml (or prime flag)"
        )

    async def dispense_drink(self, drink: Drink, pause_override: float | None = None):
        plan = self._plan_from_drink(drink)
        return await self.dispense_steps(plan.steps, plan.pause_between, pause_override)

    async def dispense_steps(
        self,
        steps: Iterable[DispenseStep | NormalizedStep],
        default_pause: float | None = None,
        pause_override: float | None = None,
    ) -> tuple[str, list[DispenseResult]]:
        steps_list = list(steps)
        if not steps_list:
            raise ValueError("No dispense steps provided")

        if isinstance(steps_list[0], NormalizedStep):
            normalized = steps_list  # type: ignore[assignment]
        else:
            normalized = self.normalize_steps(steps_list)  # type: ignore[arg-type]
        pause_from_defaults = (
            default_pause
            if default_pause is not None
            else self.controller.mapping.defaults.post_dispense_delay_seconds
        )
        pause = (
            pause_override
            if pause_override is not None
            else pause_from_defaults
        )

        run_id = uuid.uuid4().hex
        await self._increment_queue()
        await self._semaphore.acquire()
        await self._decrement_queue()
        await self._set_current(run_id)

        try:
            logger.info("Starting dispense run %s with %d steps", run_id, len(normalized))
            raw_steps = [
                {"pump": step.pump, "seconds": step.seconds, "description": step.description}
                for step in normalized
            ]
            task = self.controller.run_steps(raw_steps, pause)
            results_raw = await asyncio.wait_for(
                task, timeout=settings.dispense_timeout_seconds
            )
            results = [
                self._build_result(item, normalized[idx])
                for idx, item in enumerate(results_raw)
            ]
            return run_id, results
        finally:
            await self._clear_current(run_id)
            self._semaphore.release()

    def _build_result(self, data: dict, normalized_step: NormalizedStep) -> DispenseResult:
        pump = data["pump"]
        flow_rate = self.controller.mapping.get_flow_rate(pump)
        correction = self.controller.mapping.get_correction_factor(pump)
        estimated_ml = None
        if flow_rate:
            estimated_ml = round(flow_rate * correction * normalized_step.seconds, 2)

        return DispenseResult(
            pump=pump,
            seconds=normalized_step.seconds,
            ml=estimated_ml,
            pin=data.get("pin"),
            mode=data.get("mode", "simulation"),
            description=normalized_step.description,
        )

    async def _increment_queue(self) -> None:
        async with self._state_lock:
            self._queue_depth += 1

    async def _decrement_queue(self) -> None:
        async with self._state_lock:
            self._queue_depth = max(0, self._queue_depth - 1)

    async def _set_current(self, run_id: str) -> None:
        async with self._state_lock:
            self._current_run_id = run_id

    async def _clear_current(self, run_id: str) -> None:
        async with self._state_lock:
            if self._current_run_id == run_id:
                self._current_run_id = None

    async def metrics(self) -> dict[str, str | int | bool]:
        async with self._state_lock:
            return {
                "queue_depth": self._queue_depth,
                "current_run_id": self._current_run_id,
                "hardware_available": self.controller.hardware_available,
            }
