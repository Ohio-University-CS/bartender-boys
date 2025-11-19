from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from ..config import settings
from ..hardware import PumpController
from ..models import (
    CalibrationRequest,
    CalibrationResponse,
    DispenseRequest,
    DispenseResult,
    HealthResponse,
    PourRequest,
    PourResponse,
    PrimeRequest,
    PumpInfo,
    PumpInfoResponse,
)
from ..services.dispense import DispenseManager
from ..services.security import enforce_token

router = APIRouter()


def _get_controller(request: Request) -> PumpController:
    controller = getattr(request.app.state, "controller", None)
    if controller is None:
        raise HTTPException(status_code=500, detail="Pump controller not initialised")
    return controller


def _get_manager(request: Request) -> DispenseManager:
    manager = getattr(request.app.state, "dispense_manager", None)
    if manager is None:
        raise HTTPException(status_code=500, detail="Dispense manager not initialised")
    return manager


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    controller = _get_controller(request)
    manager = _get_manager(request)

    metrics = await manager.metrics()
    hardware_available = bool(metrics["hardware_available"])
    status_value = "ok" if hardware_available else "degraded"
    message = (
        "Ready for dispense"
        if hardware_available
        else "GPIO module missing - running in simulation mode"
    )

    return HealthResponse(
        status=status_value,
        hardware_available=hardware_available,
        queue_depth=int(metrics["queue_depth"]),
        current_run_id=metrics["current_run_id"],
        message=message,
        pumps_configured=len(controller.mapping.pumps),
        telemetry_device_id=settings.telemetry_device_id,
    )


@router.get("/pumps", response_model=PumpInfoResponse)
async def pump_info(request: Request) -> PumpInfoResponse:
    controller = _get_controller(request)
    mapping = controller.mapping
    pumps = [
        PumpInfo(
            pump=name,
            pin=pin,
            flow_rate_ml_s=mapping.flow_rates_ml_per_second.get(name),
            correction_factor=mapping.get_correction_factor(name),
        )
        for name, pin in mapping.pumps.items()
    ]

    return PumpInfoResponse(pumps=pumps, defaults=mapping.defaults.model_dump())


@router.get("/config")
async def mapping_config(request: Request) -> dict[str, Any]:
    controller = _get_controller(request)
    mapping = controller.mapping
    calibration = {
        pump: data.model_dump()
        for pump, data in mapping.calibration.items()
    }
    return {
        "mapping_path": str(settings.pi_mapping_path),
        "pumps": mapping.pumps,
        "flow_rates_ml_per_second": mapping.flow_rates_ml_per_second,
        "defaults": mapping.defaults.model_dump(),
        "calibration": calibration,
    }


@router.post("/iot/drink", response_model=PourResponse)
async def receive_drink(request: Request, payload: PourRequest) -> PourResponse:
    enforce_token(request, settings.firmware_auth_token)
    manager = _get_manager(request)
    controller = _get_controller(request)

    try:
        run_id, results = await manager.dispense_drink(payload.drink)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dispense failed: {exc}",
        ) from exc

    mode = results[0].mode if results else (
        "hardware" if controller.hardware_available else "simulation"
    )

    return PourResponse(
        status="ok",
        message=f"Dispense complete ({mode})",
        run_id=run_id,
        steps_executed=len(results),
        mode=mode,
        telemetry={"results": [r.model_dump() for r in results]},
    )


@router.post("/dispense", response_model=PourResponse)
async def dispense_steps(request: Request, payload: DispenseRequest) -> PourResponse:
    enforce_token(request, settings.firmware_auth_token)
    manager = _get_manager(request)
    controller = _get_controller(request)

    try:
        run_id, results = await manager.dispense_steps(
            payload.steps,
            default_pause=payload.pause_between,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dispense failed: {exc}",
        ) from exc

    mode = results[0].mode if results else (
        "hardware" if controller.hardware_available else "simulation"
    )
    telemetry = {
        "results": [r.model_dump() for r in results],
        "metadata": payload.metadata,
    }

    return PourResponse(
        status="ok",
        message=f"Dispense complete ({mode})",
        run_id=run_id,
        steps_executed=len(results),
        mode=mode,
        telemetry=telemetry,
    )


@router.post("/pumps/{pump_name}/prime", response_model=DispenseResult)
async def prime_pump(
    request: Request,
    pump_name: str,
    payload: PrimeRequest,
) -> DispenseResult:
    enforce_token(request, settings.firmware_auth_token)
    controller = _get_controller(request)

    try:
        result = await controller.prime(pump_name, payload.seconds)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return DispenseResult(
        pump=result["pump"],
        seconds=result["seconds"],
        ml=None,
        pin=result.get("pin"),
        mode=result.get("mode", "simulation"),
    )


@router.post(
    "/pumps/{pump_name}/calibrate",
    response_model=CalibrationResponse,
)
async def calibrate_pump(
    request: Request,
    pump_name: str,
    payload: CalibrationRequest,
) -> CalibrationResponse:
    enforce_token(request, settings.firmware_auth_token)
    controller = _get_controller(request)

    try:
        result = await controller.dispense(pump_name, payload.seconds)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    flow_rate = controller.mapping.get_flow_rate(pump_name)
    correction = controller.mapping.get_correction_factor(pump_name)
    estimated_ml = None
    if flow_rate:
        estimated_ml = round(flow_rate * correction * payload.seconds, 2)

    return CalibrationResponse(
        pump=pump_name,
        seconds=payload.seconds,
        estimated_ml=estimated_ml,
        mode=result.get("mode", "simulation"),
    )

