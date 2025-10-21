# BrewBot App Setup

[![Runs with Expo Go](https://img.shields.io/badge/Runs%20with%20Expo%20Go-000.svg?style=flat-square&logo=EXPO&labelColor=f3f3f3&logoColor=000)](https://expo.dev/client) [![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A mobile application for tracking and automating homebrewing recipes and schedules.

## ✨ Features

* Real-time step-by-step guidance for brewing
* Ingredient and equipment management
* Integrated timer for boil, mash, and fermentation
* Data visualization of past brew statistics

---

## ⚙️ Setup and Installation

Follow these steps to get a development environment running on your local machine.

### Prerequisites

You must have the following installed on your system:

* **Node.js** (LTS version recommended)
* **npm** or **Yarn** (npm is included with Node.js)
* The **Expo Go** mobile app on your Android or iOS device (or an emulator/simulator).

### 1. Clone the repository

```bash
git clone https://github.com/your-username/BrewBot-App.git
cd BrewBot-App
```

### 2. Install Dependencies

Install the necessary Node modules.

```bash
npm install
# OR
yarn install
```

### 3. Start the Development Server

Start the Metro bundler. This will also open the Expo DevTools in your web browser and display a QR code in your terminal.

```bash
npx expo start
```

## 🚀 Running the App

### On a Physical Device (Recommended)

1. Ensure your computer and mobile device are on the same Wi-Fi network.
2. Open the Expo Go app on your phone.
3. Scan the QR code displayed in your terminal or the web browser. The app should automatically start bundling and open on your device.

### On a Simulator or Emulator

If you have an iOS Simulator (requires macOS/Xcode) or Android Emulator (requires Android Studio) set up, run:

* For iOS: Press `i` in the terminal.
* For Android: Press `a` in the terminal.

## 🛠 Project Structure

```
.
├── assets/           # Images, fonts, and other static assets
├── components/       # Reusable React components
├── screens/          # Main application screens (pages)
├── App.js / App.tsx  # Main entry point of the application
├── app.json          # Expo configuration file (name, icon, etc.)
└── package.json      # Project dependencies and scripts
```

## 🤝 Contributing

Guidelines on how others can contribute to your project (e.g., bug reports, feature requests).

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AddBrewingSteps`).
3. Commit your changes (`git commit -m 'feat: add detailed brewing steps'`).
4. Push to the branch (`git push origin feature/AddBrewingSteps`).
5. Open a Pull Request.


