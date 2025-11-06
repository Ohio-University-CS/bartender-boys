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
import { Audio, InterruptionModeIOS } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

export default function BartenderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isRecording, setIsRecording] = useState(false);
  const [isTalking] = useState(false);
  
  // Generate a client ID for this session
  const clientIdRef = useRef<string>(`client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  // Convert PCM16 base64 data to WAV format
  const convertPCM16ToWAV = useCallback((base64PCM: string): string => {
    // Decode base64 to get PCM data
    const binaryString = atob(base64PCM);
    const pcmBytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      pcmBytes[i] = binaryString.charCodeAt(i);
    }
    
    // WAV file parameters (matching OpenAI Realtime API specs)
    const sampleRate = 24000;
    const channels = 1; // mono
    const bitsPerSample = 16;
    const dataLength = pcmBytes.length;
    const fileSize = 36 + dataLength; // 36 bytes header + data
    
    // Create WAV header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // RIFF header
    view.setUint8(0, 0x52); // 'R'
    view.setUint8(1, 0x49); // 'I'
    view.setUint8(2, 0x46); // 'F'
    view.setUint8(3, 0x46); // 'F'
    view.setUint32(4, fileSize, true); // File size - 8
    view.setUint8(8, 0x57); // 'W'
    view.setUint8(9, 0x41); // 'A'
    view.setUint8(10, 0x56); // 'V'
    view.setUint8(11, 0x45); // 'E'
    
    // Format chunk
    view.setUint8(12, 0x66); // 'f'
    view.setUint8(13, 0x6D); // 'm'
    view.setUint8(14, 0x74); // 't'
    view.setUint8(15, 0x20); // ' '
    view.setUint32(16, 16, true); // Format chunk size
    view.setUint16(20, 1, true); // Audio format (1 = PCM)
    view.setUint16(22, channels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true); // Byte rate
    view.setUint16(32, channels * (bitsPerSample / 8), true); // Block align
    view.setUint16(34, bitsPerSample, true); // Bits per sample
    
    // Data chunk
    view.setUint8(36, 0x64); // 'd'
    view.setUint8(37, 0x61); // 'a'
    view.setUint8(38, 0x74); // 't'
    view.setUint8(39, 0x61); // 'a'
    view.setUint32(40, dataLength, true); // Data size
    
    // Combine header and PCM data
    const wavData = new Uint8Array(44 + dataLength);
    wavData.set(new Uint8Array(header), 0);
    wavData.set(pcmBytes, 44);
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < wavData.length; i++) {
      binary += String.fromCharCode(wavData[i]);
    }
    return btoa(binary);
  }, []);

  // Handle incoming audio response and play it
  const handleAudioResponseComplete = useCallback(async (base64Data: string) => {
    try {
      console.log('[bartender] Processing complete audio response, length:', base64Data.length);
      
      // Convert PCM16 to WAV format
      const wavBase64 = convertPCM16ToWAV(base64Data);
      
      if (Platform.OS === 'web') {
        // Web: Convert base64 to Blob and play using HTML5 Audio
        const binaryString = atob(wavBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        
        const audioElement = new window.Audio(audioUrl);
        audioElement.volume = 1.0; // Set to maximum volume
        audioElement.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
        audioElement.onerror = (error: string | Event) => {
          console.error('[bartender] Error playing audio (web):', error);
          URL.revokeObjectURL(audioUrl);
        };
        
        await audioElement.play();
        console.log('[bartender] Audio playback started (web)');
      } else {
        // Native: Save to file and play using expo-av
        const fileName = `audio_${Date.now()}.wav`;
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) {
          throw new Error('Unable to get cache directory');
        }
        const fileUri = `${cacheDir}${fileName}`;
        
        // Write WAV data to file (FileSystem expects base64 string)
        await FileSystem.writeAsStringAsync(fileUri, wavBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log('[bartender] Audio file saved:', fileUri);

        // Ensure iOS routes playback to speaker (Playback category)
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
        } catch (e) {
          console.warn('[bartender] Failed to set audio mode for playback:', e);
        }
        
        // Unload previous sound if any
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }
        
        // Load and play the audio file
        const { sound } = await Audio.Sound.createAsync(
          { uri: fileUri },
          { shouldPlay: true, volume: 1.0 } // Set to maximum volume
        );
        
        soundRef.current = sound;
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            console.log('[bartender] Audio playback finished');
            sound.unloadAsync().catch(console.error);
            FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(console.error);
            soundRef.current = null;
          }
        });
        
        console.log('[bartender] Audio playback started (native)');
      }
    } catch (error) {
      console.error('[bartender] Error handling audio response:', error);
    }
  }, [convertPCM16ToWAV]);
  
  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'response.audio.delta') {
      // Collect audio delta chunks
      if (message.delta && typeof message.delta === 'string') {
        const responseId = message.response_id;
        
        // If this is a new response, reset the buffer
        if (currentResponseIdRef.current !== responseId) {
          audioResponseBufferRef.current = '';
          currentResponseIdRef.current = responseId;
        }
        
        // Append the delta to the buffer
        audioResponseBufferRef.current += message.delta;
        console.log('[bartender] Audio delta received, buffer size:', audioResponseBufferRef.current.length);
      }
    } else if (message.type === 'response.audio.done') {
      // Audio stream is complete, process the full buffer
      const completeBase64 = audioResponseBufferRef.current;
      if (completeBase64) {
        console.log('[bartender] Audio stream complete, processing buffer');
        handleAudioResponseComplete(completeBase64);
        // Reset buffer
        audioResponseBufferRef.current = '';
        currentResponseIdRef.current = null;
      }
    }
  }, [handleAudioResponseComplete]);
  
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
    onMessage: handleWebSocketMessage,
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
  
  // Audio response buffer for collecting incoming audio deltas
  const audioResponseBufferRef = useRef<string>('');
  const currentResponseIdRef = useRef<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  
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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(console.error);
        soundRef.current = null;
      }
    };
  }, []);

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
        setIsRecording(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
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
      // Configure audio for recording (iOS: PlayAndRecord)
      Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch((e) => console.warn('[bartender] Failed to set audio mode for recording:', e));

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
        // Switch audio back to playback mode so responses use speaker
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
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

