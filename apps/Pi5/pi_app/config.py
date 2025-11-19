from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_mapping_path() -> Path:
    project_root = Path(__file__).resolve().parents[2]
    backend_path = project_root / "backend" / "config" / "pi_mapping.json"
    alt_path = project_root / "apps" / "backend" / "config" / "pi_mapping.json"
    if backend_path.exists():
        return backend_path
    return alt_path


class Settings(BaseSettings):
    """Runtime configuration for the Pi firmware service."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="PI5_", extra="ignore")

    api_host: str = Field(default="0.0.0.0", description="Host interface for FastAPI")
    api_port: int = Field(default=9000, description="Port for FastAPI")
    auto_reload: bool = Field(
        default=False,
        description="Enable uvicorn auto-reload (development only)",
    )
    log_level: str = Field(default="INFO", description="Logging level (INFO, DEBUG, etc.)")

    pi_mapping_path: Path = Field(
        default_factory=_default_mapping_path,
        description="Path to pi_mapping.json",
    )
    firmware_auth_token: str | None = Field(
        default=None,
        description="Shared secret required by /iot/drink and dispense APIs",
    )

    backend_heartbeat_url: AnyHttpUrl | None = Field(
        default=None,
        description="Optional URL to POST heartbeat/telemetry events to backend",
    )
    heartbeat_interval_seconds: int = Field(
        default=30,
        ge=5,
        le=300,
        description="Interval for background heartbeat pings",
    )
    heartbeat_auth_token: str | None = Field(
        default=None,
        description="Optional token sent along with heartbeat POSTs",
    )

    max_parallel_jobs: int = Field(
        default=1,
        ge=1,
        description="Maximum number of dispense jobs to run simultaneously",
    )
    dispense_timeout_seconds: int = Field(
        default=300,
        ge=5,
        description="Timeout applied to dispense jobs",
    )

    telemetry_device_id: str = Field(
        default="brewbot-pi5",
        description="Identifier used when announcing telemetry",
    )

    extra_metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="User-defined metadata appended to telemetry payloads",
    )


settings = Settings()

