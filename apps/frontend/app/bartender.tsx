import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BartenderAvatar } from '@/components/BartenderAvatar';
import { ThemedText } from '@/components/themed-text';
import LiveAudioStream from 'react-native-live-audio-stream';
import { useWebSocket } from '@/hooks/use-websocket';

export default function BartenderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isRecording, setIsRecording] = useState(false);
  const [isTalking] = useState(false);
  
  // Generate a client ID for this session
  const clientIdRef = useRef<string>(`client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  // WebSocket connection
  const { isConnected, sendMessage } = useWebSocket({
    clientId: clientIdRef.current,
    onConnect: () => {
      console.log('[bartender] WebSocket connected');
    },
    onDisconnect: () => {
      console.log('[bartender] WebSocket disconnected');
    },
    onError: (error) => {
      console.error('[bartender] WebSocket error:', error);
    },
    autoConnect: true,
  });
  
  // Web-specific refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // Native-specific refs
  const audioStreamInitialized = useRef<boolean>(false);
  
  // Audio item ID for tracking the conversation item
  const audioItemIdRef = useRef<string>(`audio-item-${Date.now()}`);
  const audioBufferCreatedRef = useRef<boolean>(false);
  
  // Create audio buffer item before sending chunks
  const createAudioBuffer = useCallback(() => {
    if (!isConnected || audioBufferCreatedRef.current) {
      return;
    }
    
    try {
      // Create a new audio buffer item using conversation.item.create
      audioItemIdRef.current = `audio-item-${Date.now()}`;
      sendMessage({
        type: 'conversation.item.create',
        item: {
          type: 'input_audio_buffer',
          audio_buffer: {
            format: Platform.OS === 'web' ? 'opus' : 'pcm16',
            sample_rate: 24000,
            channels: 1,
          },
        },
      });
      audioBufferCreatedRef.current = true;
      console.log('[bartender] Created audio buffer:', audioItemIdRef.current);
    } catch (error) {
      console.error('[bartender] Error creating audio buffer:', error);
    }
  }, [isConnected, sendMessage]);
  
  // Function to send audio chunk via WebSocket
  const sendAudioChunk = useCallback((base64: string) => {
    if (!isConnected) {
      console.warn('[bartender] Cannot send audio chunk: WebSocket not connected');
      return;
    }
    
    // Create buffer if not already created (synchronously, don't wait)
    if (!audioBufferCreatedRef.current) {
      createAudioBuffer();
      // Note: We'll send the chunk anyway - the backend should handle it
      // In a real implementation, you might want to queue chunks
    }
    
    try {
      // Send audio chunk - OpenAI expects input_audio_buffer.append with 'audio' parameter
      sendMessage({
        type: 'input_audio_buffer.append',
        audio: base64,
      });
    } catch (error) {
      console.error('[bartender] Error sending audio chunk:', error);
    }
  }, [isConnected, sendMessage, createAudioBuffer]);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const avatarBorder = useThemeColor({}, 'border');
  const avatarBackground = useThemeColor({}, 'surface');
  const accent = useThemeColor({}, 'tint');
  const onAccent = useThemeColor({}, 'onTint');

  // Initialize audio stream on mount (native only)
  useEffect(() => {
    if (Platform.OS !== 'web' && !audioStreamInitialized.current) {
      try {
        const options = {
          sampleRate: 24000,
          channels: 1,
          bitsPerSample: 16,
          bufferSize: 4096,
          audioSource: 6, // Android: VOICE_RECOGNITION
          wavFile: '', // Required by library but not used for streaming
        };
        LiveAudioStream.init(options);
        audioStreamInitialized.current = true;
        console.log('[bartender] Audio stream initialized (native)');
      } catch (error) {
        console.error('[bartender] Error initializing audio stream:', error);
      }
    }

    return () => {
      // Cleanup audio stream on unmount
      if (Platform.OS !== 'web' && audioStreamInitialized.current) {
        try {
          if (isRecording) {
            LiveAudioStream.stop();
          }
          audioStreamInitialized.current = false;
        } catch (error) {
          console.error('[bartender] Error cleaning up audio stream:', error);
        }
      }
    };
  }, [isRecording]);

  // Convert blob to base64
  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix (data:audio/webm;base64,)
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  // Web: Start recording with MediaRecorder
  const startRecordingWeb = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available events - called periodically while recording
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          try {
            const base64 = await blobToBase64(event.data);
            console.log('[bartender] Audio chunk (web):', {
              size: event.data.size,
              base64Length: base64.length,
              timestamp: Date.now(),
            });
            // Send audio chunk via WebSocket
            sendAudioChunk(base64);
          } catch (error) {
            console.error('[bartender] Error converting chunk to base64:', error);
          }
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[bartender] Recording stopped (web)');
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('[bartender] MediaRecorder error:', event);
        Alert.alert('Recording Error', 'An error occurred while recording audio.');
        stopRecording();
      };

      // Start recording with timeslice to get chunks every 250ms
      mediaRecorder.start(250);
      setIsRecording(true);
      console.log('[bartender] Recording started (web)');
    } catch (error: any) {
      console.error('[bartender] Error starting recording (web):', error);
      Alert.alert(
        'Microphone Access Required',
        error.message || 'Please allow microphone access to use voice features.'
      );
    }
  }, [blobToBase64, sendAudioChunk]);

  // Native: Start recording with react-native-live-audio-stream
  const startRecordingNative = useCallback(() => {
    try {
      // Ensure audio stream is initialized
      if (!audioStreamInitialized.current) {
        const options = {
          sampleRate: 24000,
          channels: 1,
          bitsPerSample: 16,
          bufferSize: 4096,
          audioSource: 6, // Android: VOICE_RECOGNITION
          wavFile: '', // Required by library but not used for streaming
        };
        LiveAudioStream.init(options);
        audioStreamInitialized.current = true;
      }

      // Set up data event listener to receive base64 chunks
      const handleAudioData = (base64Data: string) => {
        console.log('[bartender] Audio chunk (native):', {
          base64Length: base64Data.length,
          firstChars: base64Data.substring(0, 50) + '...',
          timestamp: Date.now(),
        });
        // Send audio chunk via WebSocket
        sendAudioChunk(base64Data);
      };

      LiveAudioStream.on('data', handleAudioData);

      // Start recording
      LiveAudioStream.start();
      setIsRecording(true);
      console.log('[bartender] Recording started (native)');
    } catch (error: any) {
      console.error('[bartender] Error starting recording (native):', error);
      Alert.alert(
        'Recording Error',
        error.message || 'Failed to start recording. Please try again.'
      );
    }
  }, [sendAudioChunk]);

  const startRecording = useCallback(() => {
    if (Platform.OS === 'web') {
      startRecordingWeb();
    } else {
      startRecordingNative();
    }
  }, [startRecordingWeb, startRecordingNative]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!isRecording) return;

    setIsRecording(false);

    // Commit the audio buffer if it was created
    if (audioBufferCreatedRef.current && isConnected) {
      try {
        sendMessage({
          type: 'input_audio_buffer.commit',
        });
        console.log('[bartender] Committed audio buffer');
      } catch (error) {
        console.error('[bartender] Error committing audio buffer:', error);
      }
      audioBufferCreatedRef.current = false;
    }

    if (Platform.OS === 'web') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
    } else {
      // Native: Stop recording
      try {
        LiveAudioStream.stop();
        console.log('[bartender] Recording stopped (native)');
      } catch (error) {
        console.error('[bartender] Error stopping recording (native):', error);
      }
    }
  }, [isRecording, isConnected, sendMessage]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.avatarContainer, { borderBottomColor: avatarBorder, backgroundColor: avatarBackground }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={accent} />
        </TouchableOpacity>
        <BartenderAvatar isTalking={isTalking} backgroundColor={avatarBackground} />
      </View>
      
      <View style={styles.content}>
        <ThemedText style={styles.instructionText}>
          {isRecording 
            ? 'Recording... Tap the microphone to stop.'
            : 'Tap the microphone to start talking to the bartender.'}
        </ThemedText>
        <ThemedText style={styles.connectionStatus}>
          {isConnected ? 'Connected' : 'Connecting...'}
        </ThemedText>
      </View>

      <View style={[styles.controlsContainer, { borderTopColor: avatarBorder }]}>
        <TouchableOpacity
          style={[
            styles.micButton,
            { 
              backgroundColor: isRecording ? accent : avatarBackground,
              borderColor: accent,
              shadowColor: isRecording ? accent : 'transparent',
            }
          ]}
          onPress={toggleRecording}
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          accessibilityRole="button"
        >
          <Ionicons 
            name={isRecording ? 'mic' : 'mic-outline'} 
            size={32} 
            color={isRecording ? onAccent : accent} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarContainer: {
    width: '100%',
    paddingVertical: Platform.OS === 'web' ? 24 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 40 : 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: Platform.OS === 'web' ? 40 : 16,
    top: '50%',
    transform: [{ translateY: -12 }],
    padding: 8,
    zIndex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  connectionStatus: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.5,
    marginTop: 8,
  },
  controlsContainer: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});

