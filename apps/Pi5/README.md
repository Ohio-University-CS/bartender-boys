# BrewBot Pi5 Firmware

Firmware service that runs on the Raspberry Pi 5 and bridges the physical bartender rig with the Bartender Boys mobile + backend applications. It exposes the same `/iot/drink` endpoint expected by the backend while adding richer pump utilities (priming, calibration, manual dispense, telemetry).

## Folder Structure

```
apps/Pi5
├── main.py             # uvicorn entry point
├── pyproject.toml      # uv/uvicorn dependencies
├── pi_app/
│   ├── __init__.py     # FastAPI factory
│   ├── config.py       # Env + settings
│   ├── logger.py       # Logging setup
│   ├── models.py       # Shared Pydantic models
│   ├── hardware/       # GPIO/pump controller
│   └── services/       # Dispense orchestration + telemetry
└── README.md
```

## Requirements

- Python 3.11+
- `uv` or `pip` for installing dependencies
- Raspberry Pi OS (Debian Bookworm) with access to GPIO (falls back to simulation when run on a laptop)

Install dependencies with uv:

```bash
cd apps/Pi5
uv sync
```

Or with pip:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

Run the firmware API:

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 9000
```

## Configuration (`.env`)

The service ships with sensible defaults but can be tweaked via environment variables (all prefixed with `PI5_`):

| Variable | Default | Description |
| --- | --- | --- |
| `PI5_API_HOST` | `0.0.0.0` | Host interface for FastAPI |
| `PI5_API_PORT` | `9000` | API port |
| `PI5_LOG_LEVEL` | `INFO` | Logging level |
| `PI5_PI_MAPPING_PATH` | `../backend/config/pi_mapping.json` | Location of the pump mapping |
| `PI5_FIRMWARE_AUTH_TOKEN` | _(unset)_ | Shared token required for `/iot/drink` and `/dispense` |
| `PI5_BACKEND_HEARTBEAT_URL` | _(unset)_ | Optional backend endpoint to post telemetry |
| `PI5_HEARTBEAT_AUTH_TOKEN` | _(unset)_ | Bearer token sent with heartbeat POSTs |
| `PI5_HEARTBEAT_INTERVAL_SECONDS` | `30` | Heartbeat interval |
| `PI5_MAX_PARALLEL_JOBS` | `1` | Number of simultaneous dispense jobs |
| `PI5_DISPENSE_TIMEOUT_SECONDS` | `300` | Timeout for dispense runs |
| `PI5_TELEMETRY_DEVICE_ID` | `brewbot-pi5` | Device ID used in telemetry payloads |

Copy the backend's `pi_mapping.json` into place (or point the env var at your own file). The mapping defines pump → GPIO pins, flow rates, safety defaults, and calibration metadata.

## HTTP API

| Method & Path | Description |
| --- | --- |
| `GET /health` | Status info (hardware availability, queue depth, telemetry ID) |
| `GET /pumps` | Pump → pin mapping plus defaults |
| `GET /config` | Raw mapping payload |
| `POST /iot/drink` | Primary entry point used by the backend (`PourRequest`) |
| `POST /dispense` | Manually run arbitrary steps |
| `POST /pumps/{pump}/prime` | Prime a pump for N seconds |
| `POST /pumps/{pump}/calibrate` | Fire a pump for calibration runs |

All mutating endpoints expect the shared token in either the `X-Firmware-Token` header or a `Bearer` Authorization header when `PI5_FIRMWARE_AUTH_TOKEN` is set.

## How It Works

1. `PumpController` loads `pi_mapping.json`, configures GPIO (or simulation), and applies safety rules (max runtime, cooldowns, prime time).
2. `DispenseManager` converts higher-level `ml` steps into seconds using flow-rate + calibration, sequences pumps, and guards concurrency/timeouts.
3. The FastAPI router exposes `/iot/drink`, `/dispense`, `/pumps`, etc., and streams all jobs through the manager.
4. `HeartbeatService` (optional) periodically POSTs telemetry to the backend so the mobile app can display live Pi status.

## Developing Locally

- Without GPIO (macOS/Windows/Linux), the controller runs in simulation and simply sleeps for the requested duration.
- Use the `/dispense` endpoint with fake tokens to test conversion math before bringing the code to your Pi.
- Keep the `pi_mapping.json` in sync with the backend copy so ingredient names stay aligned across the stack.

Once you're happy, copy the `apps/Pi5` folder onto the Pi, install dependencies (`uv sync`), add your `.env`, and enable the service via systemd or `uv run uvicorn ...`.

