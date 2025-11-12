import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BartenderAvatar } from '@/components/BartenderAvatar';
import { ThemedText } from '@/components/themed-text';
import { useWebRTCRealtime } from '@/hooks/use-webrtc-realtime';
import { API_BASE_URL } from '@/environment';
import { useSettings } from '@/contexts/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LiveAudioStreamModule = {
  init: (options: Record<string, unknown>) => void;
  start: () => void;
  stop: () => void;
  on: (event: string, handler: (data: string) => void) => void;
  removeAllListeners?: (event?: string) => void;
};

const createLiveAudioStreamStub = (): LiveAudioStreamModule => ({
  init: () => console.warn('[bartender] Live audio module unavailable; init skipped.'),
  start: () => console.warn('[bartender] Live audio module unavailable; start skipped.'),
  stop: () => {},
  on: () => {},
  removeAllListeners: () => {},
});

const liveAudio = (() => {
  if (Platform.OS === 'web') {
    return { module: createLiveAudioStreamStub(), available: false };
  }
  try {
    const module = require('react-native-live-audio-stream') as LiveAudioStreamModule;
    return { module, available: true };
  } catch (error) {
    console.warn(
      '[bartender] react-native-live-audio-stream native module not found. Voice capture is disabled. Use a custom dev build compiled with this module.',
      error,
    );
    return { module: createLiveAudioStreamStub(), available: false };
  }
})();

const LiveAudioStream = liveAudio.module;
const isLiveAudioAvailable = liveAudio.available;

export default function BartenderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [transcript, setTranscript] = useState('');
  const [isTalking, setIsTalking] = useState(false);
  const { apiBaseUrl } = useSettings();

  const { isSessionActive, startSession, stopSession } = useWebRTCRealtime({
    onTranscript: (text) => {
      setTranscript(text);
      setIsTalking(false);
    },
    onEvent: (event) => {
      console.log('[bartender] Event received:', event);
      
      // Detect when AI is speaking
      if (event.type === 'response.audio_transcript.delta' || event.type === 'response.audio.delta') {
        setIsTalking(true);
      }
    },
    onToolCall: async (toolName, args) => {
      console.log('[bartender] Tool call received:', toolName, args);
      
      if (toolName === 'kick_user_out') {
        // Stop the session first
        stopSession();
        setTranscript('');
        setIsTalking(false);
        
        // Navigate back to chat page
        router.push('/(tabs)/chat' as never);
        
        return { success: true, message: 'User has been removed from the conversation' };
      }
      
      if (toolName === 'generate_drink') {
        try {
          const baseUrl = apiBaseUrl || API_BASE_URL;
          console.log('[bartender] Generating drink:', args);
          
          // Get user_id from AsyncStorage, default to "guest" if not provided
          let userId = args.user_id || 'guest';
          try {
            const storedUserId = await AsyncStorage.getItem('user_id');
            if (storedUserId) {
              userId = storedUserId;
            }
          } catch (error) {
            console.error('[bartender] Failed to get user_id from AsyncStorage:', error);
          }
          
          const requestBody = {
            name: args.name,
            category: args.category,
            ingredients: args.ingredients || [],
            instructions: args.instructions,
            difficulty: args.difficulty,
            prepTime: args.prepTime,
            user_id: userId,
          };
          
          const response = await fetch(`${baseUrl}/drinks/generate-drink`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[bartender] Failed to generate drink:', response.status, errorText);
            return {
              success: false,
              error: `Failed to generate drink: ${response.status} - ${errorText}`,
            };
          }
          
          const data = await response.json();
          console.log('[bartender] Drink generated successfully:', data);
          
          return {
            success: true,
            message: `Successfully created drink "${data.drink.name}" with an AI-generated image!`,
            drink: data.drink,
          };
        } catch (error) {
          console.error('[bartender] Error generating drink:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate drink',
          };
        }
      }
      
      // Unknown tool
      return { success: false, error: `Unknown tool: ${toolName}` };
    },
    onError: (error) => {
      console.error('[bartender] WebRTC error:', error);
      Alert.alert('Connection Error', error.message || 'Failed to connect to bartender');
    },
  });

  const handleToggleSession = async () => {
    if (isSessionActive) {
      stopSession();
      setTranscript('');
      setIsTalking(false);
    } else {
      try {
        await startSession();
      } catch (error) {
        console.error('[bartender] Failed to start session:', error);
      }
    }
  };

  // Cleanup session when navigating away or unmounting
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Cleanup when screen loses focus (user navigates away)
        stopSession();
        setTranscript('');
        setIsTalking(false);
      };
    }, [stopSession])
  );

  // Handle back button press with cleanup
  const handleBackPress = () => {
    stopSession();
    setTranscript('');
    setIsTalking(false);
    // Navigate to chat page instead of using router.back()
    // This ensures we always have a valid destination
    router.push('/(tabs)/chat' as never);
  };

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const avatarBorder = useThemeColor({}, 'border');
  const avatarBackground = useThemeColor({}, 'surface');
  const accent = useThemeColor({}, 'tint');
  const onAccent = useThemeColor({}, 'onTint');

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.avatarContainer, { borderBottomColor: avatarBorder, backgroundColor: avatarBackground }]}>
        <TouchableOpacity 
          onPress={handleBackPress} 
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
          {isSessionActive 
            ? 'Listening... Tap the microphone to stop.'
            : 'Tap the microphone to start talking to the bartender.'}
        </ThemedText>
        
        {transcript ? (
          <ThemedText style={styles.transcriptText}>
            {transcript}
        </ThemedText>
        ) : null}
      </View>

      <View style={[styles.controlsContainer, { borderTopColor: avatarBorder }]}>
        <TouchableOpacity
          style={[
            styles.micButton,
            { 
              backgroundColor: isSessionActive ? accent : avatarBackground,
              borderColor: accent,
              shadowColor: isSessionActive ? accent : 'transparent',
            }
          ]}
          onPress={handleToggleSession}
          accessibilityLabel={isSessionActive ? 'Stop recording' : 'Start recording'}
          accessibilityRole="button"
        >
          <Ionicons 
            name={isSessionActive ? 'mic' : 'mic-outline'} 
            size={32} 
            color={isSessionActive ? onAccent : accent} 
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
    marginBottom: 16,
  },
  transcriptText: {
    fontSize: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
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
