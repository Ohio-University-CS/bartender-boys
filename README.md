# BrewBot 🍹

> Making drinking alone even more fun with an AI-powered bartender

BrewBot is an innovative IoT application that brings the bar experience to your home through an AI-powered bartender running on a Raspberry Pi. Users can interact with an intelligent bartender through a mobile app, and watch as their drinks are automatically mixed and poured in real life using electric pumps controlled by GPIO pins.

## 🎯 Project Overview

BrewBot consists of three main components working together to create a seamless drinking experience:

- **Mobile App**: React Native frontend with Expo for user interaction
- **Backend Server**: Python-based AI agent that processes drink orders and controls hardware
- **Firmware**: Python code running on Raspberry Pi to control pumps and GPIO pins

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │  Backend Server │    │  Raspberry Pi   │
│  (React Native) │◄──►│   (Python AI)   │◄──►│   (Firmware)    │
│                 │    │                 │    │                 │
│ • User Interface│    │ • AI Bartender  │    │ • GPIO Control  │
│ • Drink Orders  │    │ • Recipe Logic  │    │ • Pump Control  │
│ • Chat Interface│    │ • Hardware API  │    │ • Real-time     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Features

- **AI Bartender**: Intelligent conversation and drink recommendations
- **Real-time Mixing**: Automated drink preparation using electric pumps
- **Precise Ratios**: Accurate ingredient measurements for perfect cocktails
- **Mobile Interface**: Intuitive React Native app for easy interaction
- **Hardware Integration**: Raspberry Pi with GPIO-controlled pumps
- **Recipe Database**: Extensive collection of cocktail recipes

## 📁 Project Structure

```
brewbot/
├── apps/
│   ├── frontend/          # React Native mobile app
│   │   ├── app/           # Expo Router pages
│   │   ├── components/    # Reusable UI components
│   │   └── package.json   # Frontend dependencies
│   ├── backend/           # Python AI server
│   │   ├── main.py        # FastAPI/Flask server
│   │   └── pyproject.toml # UV package management
│   └── firmware/          # Raspberry Pi code
│       └── pump_control.py # GPIO and pump logic
└── README.md              # This file
```

## 🛠️ Technology Stack

### Frontend
- **React Native** with Expo
- **TypeScript** for type safety
- **Expo Router** for navigation

### Backend
- **Python** with UV package manager
- **AI/ML Framework** (TBD - potentially LangChain, OpenAI, or local models)
- **Web Framework** (FastAPI or Flask)

### Hardware
- **Raspberry Pi** as the bartender brain
- **Python** for GPIO control
- **Electric Pumps** for liquid dispensing
- **GPIO Pins** for hardware interface

## 🎮 How It Works

1. **User Interaction**: Open the mobile app and start chatting with the AI bartender
2. **Drink Selection**: AI recommends drinks based on preferences or user requests
3. **Order Processing**: Backend AI processes the order and calculates precise ratios
4. **Hardware Control**: Raspberry Pi receives commands and controls pumps via GPIO
5. **Real-time Pouring**: Electric pumps dispense exact amounts of each ingredient
6. **Drink Ready**: User receives their perfectly mixed cocktail!

## 🚀 Quick Start

### Prerequisites
- Python 3.13+ with [uv](https://docs.astral.sh/uv/) package manager
- Node.js 18+ with npm
- OpenAI API key (see backend setup instructions)

### Getting Started

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd bartender-boys
   ```

2. **Set up the backend**:
   ```bash
   cd apps/backend
   cp .env.example .env
   # Edit .env with your OpenAI API key (see apps/backend/README.md for detailed instructions)
   uv sync
   ```

3. **Set up the frontend**:
   ```bash
   cd apps/frontend
   npm install
   ```

4. **Run the applications**:
   ```bash
   # Terminal 1 - Backend
   cd apps/backend
   uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Terminal 2 - Frontend
   cd apps/frontend
   npm start
   ```

For detailed setup instructions, see:
- [Backend Setup Guide](apps/backend/README.md) - Includes OpenAI API key setup
- [Frontend Setup Guide](apps/frontend/README.md)

## 🚧 Development Status

This project is currently in active development. The following components are being built:

- [x] Project structure and documentation
- [x] Backend API with OpenAI integration
- [x] Frontend mobile app structure
- [ ] Mobile app UI/UX design
- [ ] Hardware control system
- [ ] Pump calibration and testing
- [ ] End-to-end integration

*BrewBot - Because every drink deserves a personal touch, even when you're drinking alone!* 🍸
