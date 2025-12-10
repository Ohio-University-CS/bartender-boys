# BrewBot 🍹

> Spreading Alcoholic Intelligence to all

## Project Description

BrewBot is an innovative IoT application that brings the bar experience to your home through an AI-powered bartender running on a Raspberry Pi. The system consists of three main components working together to create a seamless drinking experience:

- **Mobile App**: React Native frontend with Expo for user interaction, featuring an AI chat interface and ID scanning for age verification
- **Backend Server**: Python-based FastAPI server with an AI agent that processes drink orders, manages conversations, and controls hardware
- **Firmware**: Python code running on Raspberry Pi to control electric pumps and GPIO pins for automated drink mixing

Users can interact with an intelligent bartender through a mobile app, scan their ID for age verification, and watch as their drinks are automatically mixed and poured in real life using electric pumps controlled by GPIO pins. The AI bartender provides personalized drink recommendations, engages in conversation, and ensures precise ingredient measurements for perfect cocktails.

## Demo Videos

*[Add demo video links here]*

## Features

- **AI Bartender**: Intelligent conversation and drink recommendations powered by OpenAI GPT-4o
- **Real-time Mixing**: Automated drink preparation using electric pumps controlled via Raspberry Pi GPIO pins
- **Precise Ratios**: Accurate ingredient measurements for perfect cocktails
- **Mobile Interface**: Intuitive React Native app with Expo for iOS, Android, and web platforms
- **ID Scanning**: Age verification using camera-based ID scanning with GPT-4o vision API
- **Hardware Integration**: Raspberry Pi with GPIO-controlled electric pumps for liquid dispensing
- **Recipe Database**: Extensive collection of cocktail recipes with precise measurements
- **3D Bartender Avatar**: Interactive 3D character that animates during conversations (web only)
- **Chat Interface**: Real-time conversation with the AI bartender for drink ordering and recommendations
- **User Management**: MongoDB database for storing user information and preferences

## Installation

### Prerequisites

- **Python 3.13+** with [uv](https://docs.astral.sh/uv/) package manager
- **Node.js 18+** with npm
- **OpenAI API key** (see backend setup instructions below)
- **MongoDB** (local or cloud instance)
- **Raspberry Pi** with GPIO pins (for hardware control)
- **Electric pumps** and associated hardware components

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd bartender-boys
```

### Step 2: Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd apps/backend
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your configuration:
   - Add your OpenAI API key: `OPENAI_API_KEY=sk-your-actual-api-key-here`
   - Configure MongoDB connection string if needed
   - Set firmware API URL (you can use ngrok for easy tunneling) and token if using hardware
   - See `apps/backend/README.md` for detailed environment variable documentation

4. Install dependencies:
   ```bash
   uv sync
   ```

### Step 3: Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd apps/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Step 4: Firmware Setup (Raspberry Pi)

1. Navigate to the firmware directory:
   ```bash
   cd apps/firmware
   ```

2. Install dependencies:
   ```bash
   uv sync
   ```

3. Configure GPIO pin mappings in `config/pi_mapping.json` if needed

4. Ensure proper permissions for GPIO access on Raspberry Pi

## How to Run

### Running the Backend Server

From the `apps/backend` directory:

```bash
# Development mode (with auto-reload)
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend API will be available at:
- **Base URL**: `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs` (Swagger UI)
- **Health Check**: `http://localhost:8000/health`

### Running the Frontend App

From the `apps/frontend` directory:

```bash
npm start
```

Then choose your platform:
- Press `w` for web browser
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app on your phone

### Running the Firmware (Raspberry Pi)

From the `apps/firmware` directory on your Raspberry Pi:

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8001
```

Or use the provided startup scripts:
```bash
./start-with-ngrok.sh  # If using ngrok for external access
```

### Running All Services

You can use the provided PowerShell script (Windows) or run each service in separate terminals:

```powershell
# Windows
.\run-all.ps1
```

For manual setup, run each service in separate terminal windows:
1. Terminal 1: Backend server (port 8000)
2. Terminal 2: Frontend app (Expo dev server)
3. Terminal 3: Firmware server on Raspberry Pi (port 8001)

## Usage Examples

### Example 1: Ordering a Drink

1. Open the mobile app and navigate to the Chat tab
2. Start a conversation with the AI bartender:
   ```
   User: "I'd like a margarita"
   Bartender: "Great choice! I'll prepare a classic margarita for you with tequila, lime juice, and triple sec..."
   ```
3. The AI processes the order and sends commands to the Raspberry Pi
4. Electric pumps automatically dispense the correct amounts of each ingredient
5. Your drink is ready!

### Example 2: Getting Recommendations

```
User: "What should I drink tonight?"
Bartender: "Based on your preferences, I'd recommend a Moscow Mule or a Whiskey Sour. What sounds good to you?"
```

### Example 3: ID Verification

1. Navigate to the Auth screen in the app
2. Grant camera permissions when prompted
3. Position your ID card in the camera view
4. Capture the image
5. The system uses GPT-4o vision to extract and verify your information
6. Upon successful verification, you can access the app

## Known Issues

- **Age Verification Limit**: The ID scanning feature currently does not enforce a 21+ age requirement. The system extracts date of birth information but does not validate that users meet the legal drinking age. This should be implemented to ensure compliance with age restrictions.

- **AI Voice Feature Mobile Limitation**: The AI voice/audio features only work on web platforms. Mobile devices (iOS and Android) do not support the voice functionality due to platform limitations with the current implementation.

- **Hardware Dependency**: The system requires a Raspberry Pi with properly configured GPIO pins and electric pumps. Without this hardware, drink mixing functionality will not work.

- **Network Requirements**: All components must be on the same network or properly configured for external access (e.g., using ngrok for firmware access).

## Future Work

- **Arduino Migration**: Rewrite the firmware in Arduino code to replace the Raspberry Pi with an Arduino microcontroller. This will significantly reduce component costs while maintaining the core functionality of pump control and GPIO management.

- **Age Verification Enhancement**: Implement proper age validation logic that checks if users are 21 or older based on the extracted date of birth from ID scans.

- **Mobile Voice Support**: Extend AI voice features to work on mobile platforms (iOS and Android) by implementing platform-specific audio handling.

- **Multi-user Support**: Implement user profiles and preferences for multiple users of the same system.

- **Hardware Improvements**: Add sensors for ingredient level monitoring and automatic refill notifications.

## Contributors

- **Ethan Knotts** - AI Engineer and Firmware Developer
- **Jonathan Skeen** - [Role to be specified]
- **Sam Emmons** - [Role to be specified]
- **Vihn Nguyen** - [Role to be specified]
- **Brenden Nickerson** - [Role to be specified]

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │  Backend Server │    │  Raspberry Pi   │
│  (React Native) │◄──►│   (Python AI)   │◄──►│   (Firmware)    │
│                 │    │                 │    │                 │
│ • User Interface│    │ • AI Bartender  │    │ • GPIO Control  │
│ • Drink Orders  │    │ • Recipe Logic  │    │ • Pump Control  │
│ • Chat Interface│    │ • Hardware API  │    │ • Real-time     │
│ • ID Scanning   │    │ • MongoDB       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Technology Stack

### Frontend
- **React Native** with Expo
- **TypeScript** for type safety
- **Expo Router** for navigation
- **Three.js** for 3D avatar rendering (web)

### Backend
- **Python 3.13+** with UV package manager
- **FastAPI** for RESTful API
- **OpenAI GPT-4o** for AI bartender and ID scanning
- **MongoDB** with PyMongo for data persistence
- **WebSocket** for real-time communication

### Hardware
- **Raspberry Pi** as the bartender brain
- **Python** for GPIO control
- **Electric Pumps** for liquid dispensing
- **GPIO Pins** for hardware interface

## Project Structure

```
bartender-boys/
├── apps/
│   ├── frontend/          # React Native mobile app
│   │   ├── app/           # Expo Router pages
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts
│   │   └── package.json   # Frontend dependencies
│   ├── backend/           # Python AI server
│   │   ├── main.py       # FastAPI application
│   │   ├── chat/         # Chat and conversation routes
│   │   ├── drinks/       # Drink management
│   │   ├── id_scanning/  # ID verification
│   │   ├── iot/          # IoT device communication
│   │   └── pyproject.toml # UV package management
│   └── firmware/         # Raspberry Pi code
│       ├── main.py       # FastAPI firmware server
│       └── routes.py    # GPIO and pump control
└── README.md             # This file
```

## Additional Resources

- [Backend Setup Guide](apps/backend/README.md) - Detailed backend configuration and OpenAI API key setup
- [Frontend Setup Guide](apps/frontend/README.md) - Frontend development and testing instructions
- [3D Model Guide](apps/frontend/3D_MODEL_GUIDE.md) - Customizing the 3D bartender avatar

---

*BrewBot - Because every drink deserves a personal touch, even when you're drinking alone!* 🍸
