import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function AuthScreen() {
  const router = useRouter();
  const [isCapturing, setIsCapturing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const onCapture = () => {
    setIsCapturing(true);
    setTimeout(() => {
      setIsCapturing(false);
      router.replace('/(tabs)');
    }, 600);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your ID</Text>
      <Text style={styles.subtitle}>Align your ID inside the frame and take a photo</Text>

      <View style={styles.cameraContainer}>
        <View style={styles.viewfinder}>
          {permission?.granted ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={false}
            />
          ) : (
            <View style={styles.permissionFallback}>
              <Text style={styles.permissionText}>Camera permission required</Text>
              <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.secondaryButtonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.captureButton, isCapturing && styles.captureButtonActive]} onPress={onCapture}>
          <Text style={styles.captureText}>{isCapturing ? 'Capturing…' : 'Capture ID'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#bbb',
    marginTop: 8,
  },
  cameraContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: '90%',
    aspectRatio: 1.6,
    borderStyle: 'dotted',
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fakeCamera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#111',
  },
  controls: {
    gap: 12,
    paddingBottom: 40,
  },
  permissionFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    width: '100%',
    height: '100%',
  },
  permissionText: {
    color: '#fff',
    marginBottom: 12,
  },
  permissionButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  permissionButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  secondaryButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#aaa',
    fontSize: 16,
  },
  captureButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  captureButtonActive: {
    opacity: 0.8,
  },
  captureText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
});


