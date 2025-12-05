# Raspberry Pi Pump Controller

A lightweight FastAPI service that runs on your Raspberry Pi and drives three relay-controlled pumps. The backend sends pour commands to this service, which handles GPIO control, timing, and safety delays.

## Features

- REST endpoint `POST /iot/drink` that accepts commands from the main backend.
- Optional simulation mode for development laptops (no GPIO access required).
- Single-task execution with lock-based protection to prevent overlapping pours.
- Uses the shared `config/pi_mapping.json` file to map pump IDs to GPIO pins, flow rates, and timing defaults.

## Prerequisites

- Raspberry Pi OS (Bookworm or later) with Python 3.11+.
- Three pumps wired through relays to GPIO pins defined in `config/pi_mapping.json`.
- 12V power supply for the pumps (with common ground tied to the Pi).
- Network connectivity between the Pi and the machine running the backend.

## Installation

```bash
# On the Raspberry Pi
cd ~/bartender-boys/apps/pi-controller
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

If `RPi.GPIO` refuses to install on a non-Pi development machine, set `SIMULATE_GPIO=1` when running the server.

## Configuration

The controller reads pump metadata from `config/pi_mapping.json`. Update the GPIO pins or labels there as needed. You can also override the location with an environment variable:

```bash
export PI_MAPPING_PATH=/path/to/pi_mapping.json
```

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SIMULATE_GPIO` | Set to `1` to disable real GPIO access (useful off Pi) | `0` |
| `PI_CONTROLLER_HOST` | Bind address for the service | `0.0.0.0` |
| `PI_CONTROLLER_PORT` | Port to serve on | `9000` |
| `PI_MAPPING_PATH` | Path to JSON config | `config/pi_mapping.json` |

## Running the service

```bash
source .venv/bin/activate
uvicorn main:app --host ${PI_CONTROLLER_HOST:-0.0.0.0} --port ${PI_CONTROLLER_PORT:-9000}
```

You should see logs confirming the pump pins were initialised. The backend should be configured with:

```bash
export FIRMWARE_API_URL="http://<pi-ip>:9000"
```

## API

- `GET /health` — basic readiness check.
- `POST /iot/drink` — accepts the payload produced by `apps/backend/iot/utils.build_firmware_command`. Example body:

```json
{
  "drink": { "name": "Margarita", "id": "123" },
  "pump": {
    "id": "pineapple_juice",
    "label": "Bottle A",
    "gpio_pin": 17,
    "duration_seconds": 5.5,
    "prime_seconds": 1.0,
    "post_dispense_delay_seconds": 0.5,
    "cooldown_seconds": 3,
    "target_volume_ml": 60,
    "liquid": "Pineapple Juice",
    "flow_rate_ml_per_second": 11.0,
    "active_low": true
  }
}
```

The controller engages the specified pin, runs the pump for `prime_seconds + duration_seconds`, applies post-dispense and cooldown delays, then responds with a status message.

## Service integration (optional)

To run as a systemd service, create `/etc/systemd/system/bartender-pumps.service`:

```ini
[Unit]
Description=Bartender Pump Controller
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/pi/bartender-boys/apps/pi-controller
Environment="PI_CONTROLLER_HOST=0.0.0.0"
Environment="PI_CONTROLLER_PORT=9000"
Environment="PI_MAPPING_PATH=/home/pi/bartender-boys/apps/pi-controller/config/pi_mapping.json"
ExecStart=/home/pi/bartender-boys/apps/pi-controller/.venv/bin/uvicorn main:app --host ${PI_CONTROLLER_HOST} --port ${PI_CONTROLLER_PORT}
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable bartender-pumps
sudo systemctl start bartender-pumps
```

## Safety notes

- Never run the pumps dry. Prime them with liquid before testing.
- Ensure your relay board matches the `active_low` setting; change it in `pi_mapping.json` if your relays are active-high.
- The controller enforces a maximum run time from the config to protect the pumps and prevent spills.
- Always share ground between the Pi, the relay board, and the external pump power supply.
