import logging
from fastapi import APIRouter, HTTPException

from .models import PourRequest, PourResponse, SelectedPump
from .utils import (
    FirmwareClient,
    build_firmware_command,
    get_hardware_profile,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/iot", tags=["IoT"])

_firmware_client: FirmwareClient | None = None
try:
    _hardware_profile = get_hardware_profile()
except RuntimeError as exc:  # pragma: no cover - configuration issues
    logger.error("Hardware profile load failed: %s", exc)
    _hardware_profile = None


def get_firmware_client() -> FirmwareClient | None:
    """Get or create the firmware client instance. Returns None if not configured."""
    global _firmware_client
    if _firmware_client is None:
        try:
            _firmware_client = FirmwareClient()
        except ValueError as e:
            logger.warning(f"Firmware client not configured: {str(e)}")
            return None
    return _firmware_client


@router.post("/pour", response_model=PourResponse)
async def send_drink_to_firmware(request: PourRequest) -> PourResponse:
    """
    Send a drink request to the firmware API.

    Args:
        request: Drink request containing the drink object

    Returns:
        Response from firmware API, or success response if firmware is unavailable
    """
    drink_payload = (
        request.drink.model_dump()
        if hasattr(request.drink, "model_dump")
        else request.drink.dict()
    )
    if _hardware_profile is None:
        logger.warning(
            "Hardware profile unavailable. Defaulting to simulated pump selection."
        )
        try:
            profile = get_hardware_profile()
            selection = profile.choose_random_pump()
            global _hardware_profile  # noqa: PLW0603 - update cache after recovery
            _hardware_profile = profile
        except RuntimeError as exc:  # pragma: no cover - config missing
            raise HTTPException(
                status_code=500,
                detail="Pi pump configuration not found. Ensure pi_mapping.json exists.",
            ) from exc
    else:
        selection = _hardware_profile.choose_random_pump()
    selected_pump = SelectedPump(**selection.to_response_dict())
    command_payload = build_firmware_command(drink_payload, selection)

    client = get_firmware_client()
    if client is None:
        logger.warning(
            "Firmware API URL not configured. Simulating pour via pump %s.",
            selected_pump.id,
        )
        return PourResponse(
            status="ok",
            message=(
                "Firmware API not configured - simulated dispense using "
                f"{selected_pump.label}"
            ),
            selected_pump=selected_pump,
        )

    try:
        result = await client.send_drink_request(command_payload)
        status = result.get("status", "ok")
        message = result.get("message") or f"Dispensing via {selected_pump.label}."

        if status != "ok":
            return PourResponse(
                status="error",
                message=message,
                selected_pump=selected_pump,
            )

        return PourResponse(status="ok", message=message, selected_pump=selected_pump)
    except Exception as exc:
        # Prefer to surface HTTP-specific errors if httpx is available
        try:
            import httpx  # local import to avoid module dependency issues

            if isinstance(exc, httpx.HTTPError):
                logger.warning(
                    "Firmware communication HTTP error (%s). Returning simulated success.", exc
                )
                return PourResponse(
                    status="ok",
                    message=(
                        "Firmware communication error - request accepted using "
                        f"{selected_pump.label}, but hardware may not have dispensed."
                    ),
                    selected_pump=selected_pump,
                )
        except Exception:
            pass

        logger.warning(
            "Firmware communication error (%s). Returning simulated success.", exc
        )
        return PourResponse(
            status="ok",
            message=(
                "Firmware communication error - request accepted using "
                f"{selected_pump.label}, but hardware may not have dispensed."
            ),
            selected_pump=selected_pump,
        )
