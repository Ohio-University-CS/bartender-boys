# 3D Bartender Avatar - Model Replacement Guide

## Overview
The bartender chat screen now includes a 3D animated avatar that:
- Shows a placeholder 3D character (simple geometric shapes)
- Animates with an idle breathing motion
- Performs a talking animation when the assistant responds
- Can be easily replaced with your own custom 3D model

## How to Add Your Own 3D Model

### Step 1: Prepare Your 3D Model
1. **Supported formats**: GLB or GLTF
2. **Recommended specs**:
   - Polygon count: < 50,000 triangles for mobile performance
   - Texture size: 1024x1024 or 2048x2048
   - Include animations in the model file if desired

### Step 2: Export Your Model
If you're using Blender, 3ds Max, or similar:
1. Export as GLB (recommended) or GLTF
2. Include animations with these naming conventions:
   - `idle` or `Idle` - Default standing/breathing animation
   - `talking` or `Talk` - Animation for when speaking
   - `listening` or `Listen` - Attentive pose (optional)
   - `thinking` or `Think` - Pondering gesture (optional)

### Step 3: Add Model to Your Project
1. Create the models directory:
   ```
   apps/frontend/assets/models/
   ```

2. Place your model file there:
   ```
   apps/frontend/assets/models/bartender.glb
   ```

### Step 4: Update the Component
Open `apps/frontend/app/(tabs)/chat.tsx` and find this line:
```tsx
<BartenderAvatar isTalking={isTalking} height={250} />
```

Change it to:
```tsx
<BartenderAvatar 
  isTalking={isTalking} 
  height={250}
  modelPath={require('@/assets/models/bartender.glb')}
/>
```

### Step 5: Update BartenderAvatar Component (if using custom model)
Open `apps/frontend/components/BartenderAvatar.tsx` and add the GLTFLoader functionality.

At the top, add the import:
```tsx
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
```

Then replace the `createPlaceholderModel` call in `onContextCreate` with:
```tsx
if (modelPath) {
  // Load custom GLB/GLTF model
  const asset = Asset.fromModule(modelPath);
  await asset.downloadAsync();
  
  const loader = new GLTFLoader();
  const gltf = await new Promise<any>((resolve, reject) => {
    loader.load(
      asset.localUri || asset.uri,
      resolve,
      undefined,
      reject
    );
  });

  const model = gltf.scene;
  model.scale.set(1, 1, 1); // Adjust scale as needed
  model.position.set(0, 0, 0);
  
  meshRef.current = model;
  scene.add(model);

  // If your model has animations
  if (gltf.animations && gltf.animations.length > 0) {
    const mixer = new THREE.AnimationMixer(model);
    // Find and play idle animation
    const idleClip = gltf.animations.find((clip: any) => 
      clip.name.toLowerCase().includes('idle')
    );
    if (idleClip) {
      const action = mixer.clipAction(idleClip);
      action.play();
    }
    // Store mixer for talking animation later
    // (you'll need to add a mixerRef)
  }
} else {
  createPlaceholderModel(scene);
}
```

## Current Implementation

### Files Modified
- `apps/frontend/components/BartenderAvatar.tsx` - 3D avatar component
- `apps/frontend/app/(tabs)/chat.tsx` - Chat screen with integrated avatar

### Features
- **Placeholder model**: Simple geometric character (head, body, arms)
- **Idle animation**: Gentle bobbing motion
- **Talking animation**: Energetic movement when `isTalking` is true
- **Auto-timing**: Animation duration based on message length (~150 words/min)

### Dependencies Installed
```json
{
  "expo-gl": "^16.0.7",
  "three": "^0.166.1",
  "expo-asset": "^12.0.9",
  "expo-three": "^8.0.0",
  "@types/three": "^0.166.0" (dev)
}
```

## Testing

### Run the App
1. Start the frontend:
   ```powershell
   cd apps\frontend
   npm start
   ```

2. Open on device:
   - Scan QR code with Expo Go (Android/iOS)
   - Or press `w` for web browser
   - Or press `a` for Android emulator

3. Navigate to the Chat tab

4. Send a message and watch the bartender animate when the AI responds!

### Troubleshooting

**Issue**: Model doesn't load
- Check file path in `require()` statement
- Verify file is in `assets/models/` directory
- Check console for error messages

**Issue**: Model is too big/small
- Adjust the scale in `model.scale.set(x, y, z)`
- Try values like 0.5, 1, 2, etc.

**Issue**: Model is positioned wrong
- Adjust `model.position.set(x, y, z)`
- Or adjust camera position in the component

**Issue**: Animations don't play
- Verify your GLB file contains animations
- Check animation names match expected patterns
- Look at console logs for available animation names

## Advanced Customization

### Camera Settings
In `BartenderAvatar.tsx`, adjust camera position:
```tsx
camera.position.set(0, 0, 5); // x, y, z
camera.lookAt(0, 0, 0);
```

### Lighting
Modify the lights in `onContextCreate`:
```tsx
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // color, intensity
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
```

### Animation Speed
Modify the animation in the render loop:
```tsx
// Faster talking animation
meshRef.current.rotation.y = Math.sin(timeRef.current * 10) * 0.2;
```

## Next Steps
- Add more animation states (greeting, thinking, etc.)
- Add lip-sync using morph targets
- Add voice synthesis (text-to-speech)
- Add interactive gestures

## Resources
- [Three.js Documentation](https://threejs.org/docs/)
- [Expo GL Documentation](https://docs.expo.dev/versions/latest/sdk/gl-view/)
- [Blender GLB Export Guide](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)
