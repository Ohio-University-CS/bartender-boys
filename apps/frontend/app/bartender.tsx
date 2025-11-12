import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BartenderAvatar } from '@/components/BartenderAvatar';
import { ThemedText } from '@/components/themed-text';
import { useWebRTCRealtime } from '@/hooks/use-webrtc-realtime';

export default function BartenderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [transcript, setTranscript] = useState('');
  const [isTalking, setIsTalking] = useState(false);

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
      
      // Handle function calls if needed
      if (event.type === 'response.function_call_arguments.done') {
        // Handle function calls here if needed
        console.log('[bartender] Function call:', event.name, event.arguments);
      }
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
