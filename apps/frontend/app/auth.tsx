import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import axios from 'axios';
import { API_BASE_URL } from '../environment';
import { useSettings } from '@/contexts/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface IDScanResult {
  name?: string;
  state?: string;
  date_of_birth?: string;
  sex?: string;
  eye_color?: string;
  is_valid?: boolean;
  error?: string;
  raw_response?: string;
}


export default function AuthScreen() {
  const router = useRouter();
  const [isCapturing, setIsCapturing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [scanResult, setScanResult] = useState<IDScanResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkingBypass, setCheckingBypass] = useState(true);
  const { apiBaseUrl, idPhotoWidth, scanTimeoutMs } = useSettings();

  useEffect(() => {
    // On mount, if user previously skipped or verified, go straight to app
    (async () => {
      try {
        const isVerified = await AsyncStorage.getItem('isVerified');
        if (isVerified === 'true') {
          router.replace('/(tabs)/menu');
          return;
        }
      } catch {}
      finally {
        setCheckingBypass(false);
      }
    })();
  }, [router]);

  // On web, automatically skip ID verification to avoid blank/permission issues
  useEffect(() => {
    if (!checkingBypass && typeof window !== 'undefined' && Platform.OS === 'web') {
      // Small delay to let the screen mount smoothly
      const t = setTimeout(() => {
        onSkip();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [checkingBypass]);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const onSkip = async () => {
    try {
      await AsyncStorage.setItem('isVerified', 'true');
    } catch {}
    router.replace('/(tabs)/menu');
  };

  const onCapture = async () => {
    if (!cameraRef.current) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (photo?.uri) {
        // Freeze the camera view immediately by showing the captured image
        setCapturedImage(photo.uri);
        setIsProcessing(true);
        
        const manipulated = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: idPhotoWidth || 900 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        setCapturedImage(manipulated.uri);

        // Convert to base64
        const resp = await fetch(manipulated.uri);
        const blob = await resp.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(blob);
        });

        // Send to backend with longer timeout (OpenAI can be slow)
        const baseUrl = apiBaseUrl || API_BASE_URL;
        console.log(`Sending request to: ${baseUrl}/id-scanning/scan`);
        const apiResponse = await axios.post(
          `${baseUrl}/id-scanning/scan`, 
          { image_data: base64 },
          { timeout: scanTimeoutMs || 60000 } // timeout for OpenAI processing
        );
        console.log('Response received:', apiResponse.data);
        setScanResult(apiResponse.data);

        // Check for errors in the response
        if (apiResponse.data?.error) {
          Alert.alert('ID Scan Error', apiResponse.data.error);
          setCapturedImage(null);
          setIsProcessing(false);
          return;
        }

        // If it looks valid, continue to app
        if (apiResponse.data?.is_valid) {
          router.replace('/(tabs)/menu');
        } else {
          Alert.alert('Invalid ID', 'The ID could not be verified. Please try again with a clear photo of a valid ID.');
          setCapturedImage(null);
          setIsProcessing(false);
        }
      }
    } catch (error: any) {
      console.error('Auth ID capture error:', error);
      let errorMessage = 'Failed to capture or verify ID';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Make sure the backend is running and reachable.';
      } else if (error.response) {
        errorMessage = `Server error: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}`;
      } else if (error.request) {
        const baseUrl = apiBaseUrl || API_BASE_URL;
        errorMessage = `Cannot reach backend at ${baseUrl}. Check your network connection and backend server.`;
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      Alert.alert('Error', errorMessage);
      setCapturedImage(null);
      setIsProcessing(false);
    } finally {
      setIsCapturing(false);
    }
  };

  if (checkingBypass) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#FFA500" />
        <Text style={{ color: '#bbb', marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your ID</Text>
      <Text style={styles.subtitle}>Align your ID inside the frame and take a photo</Text>

      <View style={styles.cameraContainer}>
        <View style={styles.viewfinder}>
          {permission?.granted ? (
            capturedImage ? (
              <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={false}
              />
            )
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
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>Processing ID...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.captureButtonActive]}
            onPress={onCapture}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.captureText}>Capture ID</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  title: {
    color: '#F5F5F5',
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
    borderStyle: 'solid',
    borderWidth: 2,
    borderColor: '#FFA500',
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
  captureButton: {
    backgroundColor: '#FFA500',
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
  processingContainer: {
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});


