import logging
import httpx
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from .models import (
    PourRequest,
    PourResponse,
    PumpConfigRequest,
    PumpConfigResponse,
    SelectedPump,
)
from .utils import (
    FirmwareClient,
    build_firmware_command,
    get_hardware_profile,
)
from data.pump_config import (
    get_pump_config,
    create_or_update_pump_config,
    normalize_to_snake_case,
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


@router.get("/pump-config", response_model=PumpConfigResponse)
async def get_pump_config_endpoint(
    user_id: str = Query(..., description="User ID to fetch pump config for"),
) -> PumpConfigResponse:
    """
    Get pump configuration for a user.

    Args:
        user_id: User ID to fetch config for

    Returns:
        Pump configuration for the user
    """
    try:
        config = await get_pump_config(user_id)
        if config is None:
            # Return default empty config if not found
            return PumpConfigResponse(
                user_id=user_id,
                pump1=None,
                pump2=None,
                pump3=None,
            )
        return PumpConfigResponse(
            user_id=config.get("user_id", user_id),
            pump1=config.get("pump1"),
            pump2=config.get("pump2"),
            pump3=config.get("pump3"),
        )
    except Exception as e:
        logger.error(f"Failed to get pump config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get pump config: {str(e)}")


@router.post("/pump-config", response_model=PumpConfigResponse)
async def create_or_update_pump_config_endpoint(
    request: PumpConfigRequest,
) -> PumpConfigResponse:
    """
    Create or update pump configuration for a user.

    Args:
        request: Pump configuration request

    Returns:
        Created/updated pump configuration
    """
    try:
        config = await create_or_update_pump_config(
            user_id=request.user_id,
            pump1=request.pump1,
            pump2=request.pump2,
            pump3=request.pump3,
        )
        return PumpConfigResponse(
            user_id=config.get("user_id", request.user_id),
            pump1=config.get("pump1"),
            pump2=config.get("pump2"),
            pump3=config.get("pump3"),
        )
    except Exception as e:
        logger.error(f"Failed to create/update pump config: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create/update pump config: {str(e)}"
        )


@router.post("/pour", response_model=PourResponse)
async def send_drink_to_firmware(request: PourRequest) -> PourResponse:
    """
    Send a drink request to the firmware API.
    
    Validates that all required ingredients are available in the user's pump configuration
    before sending to firmware.

    Args:
        request: Drink request containing the drink object and user_id

    Returns:
        Response from firmware API, or error if ingredients are missing
    """
    global _hardware_profile  # noqa: PLW0603 - used for caching hardware profile
    
    # Validate ingredients if user_id is provided
    if request.user_id:
        try:
            pump_config = await get_pump_config(request.user_id)
            
            if pump_config:
                # Get available ingredients from pumps
                available_ingredients = set()
                for pump_key in ["pump1", "pump2", "pump3"]:
                    pump_value = pump_config.get(pump_key)
                    if pump_value:
                        available_ingredients.add(pump_value)
                
                # Normalize drink ingredients to snake_case and check availability
                drink_ingredients = request.drink.ingredients or []
                missing_ingredients = []
                
                for ingredient in drink_ingredients:
                    normalized_ingredient = normalize_to_snake_case(ingredient)
                    if normalized_ingredient not in available_ingredients:
                        missing_ingredients.append(ingredient)
                
                if missing_ingredients:
                    missing_list = ", ".join(missing_ingredients)
                    available_list = ", ".join(sorted(available_ingredients)) if available_ingredients else "none"
                    error_message = (
                        f"Cannot pour {request.drink.name}: missing ingredients ({missing_list}). "
                        f"Available ingredients: {available_list}. "
                        f"Please configure your pumps in settings or choose a different drink."
                    )
                    logger.warning(
                        f"Pour request rejected for user {request.user_id}: {error_message}"
                    )
                    return PourResponse(
                        status="error",
                        message=error_message,
                        selected_pump=None,
                    )
        except Exception as e:
            logger.error(f"Error validating pump config: {str(e)}")
            # Continue with pour if validation fails (don't block on config errors)
            logger.warning("Continuing with pour despite pump config validation error")
    
    # Generate hardware_steps from ratios if available (before building payload)
    drink = request.drink
    if drink.ratios and request.user_id:
        try:
            pump_config = await get_pump_config(request.user_id)
            if pump_config:
                # Create ingredient to pump mapping
                ingredient_to_pump = {}
                for pump_key in ["pump1", "pump2", "pump3"]:
                    pump_value = pump_config.get(pump_key)
                    if pump_value:
                        ingredient_to_pump[pump_value] = pump_key
                
                # Generate hardware steps from ratios
                # 100% = 5 seconds, so ratio% = (ratio / 100) * 5 seconds
                # All pumps run simultaneously for their respective durations
                from drinks.models import DispenseStep
                hardware_steps = []
                
                for i, ingredient in enumerate(drink.ingredients):
                    normalized_ingredient = normalize_to_snake_case(ingredient)
                    pump = ingredient_to_pump.get(normalized_ingredient)
                    
                    if pump and i < len(drink.ratios):
                        ratio = drink.ratios[i]
                        # Calculate seconds: 100% = 5 seconds
                        seconds = (ratio / 100.0) * 5.0
                        
                        hardware_steps.append(DispenseStep(
                            pump=pump,
                            seconds=seconds,
                            description=f"{ingredient} ({ratio}%)"
                        ))
                
                # If we generated steps, add them to the drink
                if hardware_steps:
                    drink.hardware_steps = hardware_steps
                    # Create and store pump mapping for firmware
                    # Map: ingredient (normalized) -> pump name
                    pump_mapping = {}
                    for i, ingredient in enumerate(drink.ingredients):
                        normalized_ingredient = normalize_to_snake_case(ingredient)
                        pump = ingredient_to_pump.get(normalized_ingredient)
                        if pump:
                            pump_mapping[normalized_ingredient] = pump
                    # Store mapping on drink object (will be included in dict)
                    drink._pump_mapping = pump_mapping
                    logger.info(f"Generated {len(hardware_steps)} hardware steps from ratios for {drink.name}, pump mapping: {pump_mapping}")
        except Exception as e:
            logger.warning(f"Failed to generate hardware steps from ratios: {str(e)}")
            # Continue without hardware steps
    
    # Get hardware profile and select pump
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
    
    # Build drink payload (after potential hardware_steps generation)
    drink_payload = (
        drink.model_dump()
        if hasattr(drink, "model_dump")
        else drink.dict(by_alias=True, exclude_none=True)
    )
    # Add pump mapping if it was generated
    if hasattr(drink, '_pump_mapping'):
        drink_payload['pump_mapping'] = drink._pump_mapping
    
    # Build firmware command payload
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
