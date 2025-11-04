# Creating an iOS Development Build for iPhone

This guide will help you create a development build that includes native modules like `react-native-live-audio-stream`.

## Prerequisites

1. **macOS** - iOS builds require macOS
2. **Xcode** - Install from the Mac App Store (requires Xcode 15+)
3. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
4. **CocoaPods** (will be installed automatically, or install manually):
   ```bash
   sudo gem install cocoapods
   ```
5. **Apple Developer Account** (free account works for development)
   - Sign up at https://developer.apple.com/

## Step 1: Install Dependencies

```bash
cd apps/frontend
npm install
```

## Step 2: Install iOS Dependencies

```bash
cd ios
pod install
cd ..
```

## Step 3: Build and Run on Your iPhone

### Option A: Build and Install Directly (Recommended)

1. **Connect your iPhone** to your Mac via USB
2. **Trust your computer** on your iPhone if prompted
3. **Enable Developer Mode** on your iPhone:
   - Settings → Privacy & Security → Developer Mode → Enable
   - Restart your iPhone if prompted

4. **Build and run**:
   ```bash
   npm run ios
   # or
   npx expo run:ios
   ```

5. **Select your device** when prompted:
   - Choose your connected iPhone from the list
   - The build will compile and install on your device

6. **Trust the developer certificate** on your iPhone:
   - Settings → General → VPN & Device Management
   - Tap on your developer certificate
   - Tap "Trust"

### Option B: Build for a Specific Device

```bash
# List connected devices
xcrun xctrace list devices

# Build for specific device
npx expo run:ios --device "Your iPhone Name"
```

### Option C: Build for Simulator (Testing)

If you want to test in the iOS Simulator first:

```bash
npx expo run:ios --simulator
```

## Troubleshooting

### "iOS 26.0 is not installed" (iPhone 17 or newer devices)

If you have an iPhone 17 or newer device running iOS 26.0+, you need to install the iOS 26 SDK:

1. **Open Xcode**
2. **Go to Xcode → Settings (or Preferences)**
3. **Click on "Platforms" (or "Components" in older versions)**
4. **Download iOS 26.0 SDK** (or the latest available SDK)
5. **Wait for download to complete** (this may take several minutes)
6. **Restart Xcode**

Alternatively, you can:
- **Use Xcode manually** to configure the build:
  ```bash
  open apps/frontend/ios/BrewBot.xcworkspace
  ```
  Then:
  1. Select your device in the device dropdown
  2. Xcode will prompt you to download the SDK if needed
  3. Configure signing in "Signing & Capabilities"
  4. Build and run from Xcode (⌘R)

### "No devices found"
- Make sure your iPhone is connected via USB
- Unlock your iPhone
- Trust the computer on your iPhone
- Try unplugging and replugging the USB cable

### "Signing for requires a development team"
1. Open Xcode
2. Open `apps/frontend/ios/BrewBot.xcworkspace`
3. Select the project in the navigator
4. Go to "Signing & Capabilities"
5. Select your Apple ID team
6. Xcode will automatically manage signing

### "Build failed" or "Pod install failed"
- Make sure you're in the `apps/frontend` directory
- Try:
  ```bash
  cd ios
  pod deintegrate
  pod install
  cd ..
  ```

### "Module not found" errors
- Make sure you've run `npm install` and `pod install`
- Try:
  ```bash
  cd apps/frontend
  rm -rf node_modules
  npm install
  cd ios
  pod install
  cd ..
  ```

## After First Build

Once the build is installed on your iPhone:

1. **Keep it installed** - The app will stay on your device
2. **For updates** - Just run `npm run ios` again to rebuild and update
3. **Development** - You can use `npm start` to start the Metro bundler, and the app will reload automatically

## Running the Development Server

After the build is installed:

```bash
# Start the development server
npm start

# The app on your iPhone will automatically reload when you make code changes
```

## Notes

- The first build takes 5-10 minutes
- Subsequent builds are faster (usually 1-2 minutes)
- You need to rebuild when you add new native dependencies
- Code changes (JavaScript/TypeScript) hot-reload without rebuilding

