from __future__ import annotations

from fastapi import FastAPI

from .config import settings
from .hardware import PumpController, load_pump_mapping
from .logger import configure_logging
from .routes import router as api_router
from .services.dispense import DispenseManager
from .services.heartbeat import HeartbeatService


def create_app() -> FastAPI:
    """Factory used by uvicorn."""

    configure_logging(settings.log_level)
    mapping = load_pump_mapping(settings.pi_mapping_path)
    controller = PumpController(mapping)
    manager = DispenseManager(controller)
    heartbeat = HeartbeatService(state_supplier=manager.metrics)

    app = FastAPI(title="BrewBot Pi5 Firmware", version="0.1.0")
    app.state.controller = controller
    app.state.dispense_manager = manager
    app.state.heartbeat = heartbeat

    app.include_router(api_router)

    @app.on_event("startup")
    async def _startup() -> None:
        await heartbeat.start()

    @app.on_event("shutdown")
    async def _shutdown() -> None:
        await heartbeat.stop()
        controller.cleanup()

    return app

