from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, ConfigDict


class DispenseStep(BaseModel):
    """User-facing description of a pump activation."""

    model_config = ConfigDict(populate_by_name=True)

    pump: str = Field(..., description="Pump identifier defined in pi_mapping.json")
    seconds: float | None = Field(
        default=None,
        gt=0,
        description="How long to run the pump (takes precedence over ml)",
    )
    ml: float | None = Field(
        default=None,
        gt=0,
        description="Target volume to convert to seconds using flow rates",
    )
    prime: bool = Field(
        default=False,
        description="Use prime time from defaults regardless of ml/seconds",
    )
    description: str | None = Field(
        default=None,
        description="Optional label describing the step purpose",
    )


class DispensePlan(BaseModel):
    """Complete dispense plan consisting of multiple steps."""

    steps: list[DispenseStep]
    pause_between: float = Field(
        default=0.25,
        ge=0.0,
        le=5.0,
        description="Pause between steps (seconds)",
    )


class Drink(BaseModel):
    """Drink data exchanged with the backend."""

    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    category: str
    ingredients: list[str]
    instructions: str
    difficulty: Literal["Easy", "Medium", "Hard"]
    prepTime: str = Field(..., alias="prepTime")
    hardware_steps: list[DispenseStep] | None = Field(
        default=None, alias="hardwareSteps", description="Explicit hardware steps"
    )
    dispense: DispensePlan | None = Field(
        default=None,
        description="Alternative dispense plan payload",
    )
    image_url: Optional[str] = Field(default=None, alias="image_url")
    favorited: Optional[bool] = None
    user_id: Optional[str] = Field(default=None, alias="user_id")


class PourRequest(BaseModel):
    drink: Drink


class PourResponse(BaseModel):
    status: Literal["ok", "error"]
    message: str
    run_id: str | None = None
    steps_executed: int | None = None
    mode: Literal["hardware", "simulation"] | None = None
    telemetry: dict[str, Any] | None = None


class DispenseRequest(BaseModel):
    steps: list[DispenseStep]
    pause_between: float | None = Field(default=None, ge=0.0, le=5.0)
    metadata: dict[str, Any] | None = None


class DispenseResult(BaseModel):
    pump: str
    seconds: float
    ml: float | None = None
    pin: int | None = None
    mode: Literal["hardware", "simulation"]
    description: str | None = None


class PrimeRequest(BaseModel):
    seconds: float | None = Field(default=None, gt=0, le=10)


class CalibrationRequest(BaseModel):
    seconds: float = Field(..., gt=0, le=30)


class CalibrationResponse(BaseModel):
    pump: str
    seconds: float
    estimated_ml: float | None = None
    mode: Literal["hardware", "simulation"]


class PumpInfo(BaseModel):
    pump: str
    pin: int
    flow_rate_ml_s: float | None = None
    correction_factor: float = 1.0


class PumpInfoResponse(BaseModel):
    pumps: list[PumpInfo]
    defaults: dict[str, float]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    hardware_available: bool
    queue_depth: int
    current_run_id: str | None
    message: str
    pumps_configured: int
    telemetry_device_id: str

