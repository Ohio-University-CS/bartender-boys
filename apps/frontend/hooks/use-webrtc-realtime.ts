import { useState, useRef, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { getRealtimeToken } from '@/utils/realtime';
import { useSettings } from '@/contexts/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditionally import native modules - they're not available in Expo Go
let InCallManager: any = null;
let mediaDevices: any = null;
let RTCPeerConnection: any = null;
let MediaStream: any = null;

// Check if we're in Expo Go (native modules won't be available)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

if (!isExpoGo) {
  try {
    // Try to import native modules - will fail in Expo Go
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    InCallManager = require('react-native-incall-manager').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webrtcShim = require('react-native-webrtc-web-shim');
    mediaDevices = webrtcShim.mediaDevices;
    RTCPeerConnection = webrtcShim.RTCPeerConnection;
    MediaStream = webrtcShim.MediaStream;
  } catch {
    // Native modules not available - this is expected in Expo Go
    console.warn('[useWebRTCRealtime] Native modules not available (likely running in Expo Go). WebRTC features will be limited to web platform.');
  }
}

// On web, use browser WebRTC APIs directly (only if in browser environment)
if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined') {
  mediaDevices = navigator.mediaDevices;
  RTCPeerConnection = window.RTCPeerConnection || (window as any).webkitRTCPeerConnection;
  MediaStream = window.MediaStream || (window as any).webkitMediaStream;
}

export interface UseWebRTCRealtimeOptions {
  onTranscript?: (transcript: string) => void;
  onEvent?: (event: any) => void;
  onError?: (error: Error) => void;
  onToolCall?: (toolName: string, args: any) => Promise<any>;
}

export interface UseWebRTCRealtimeReturn {
  isSessionActive: boolean;
  startSession: () => Promise<void>;
  stopSession: () => void;
  sendEvent: (event: any) => void;
}

/**
 * React hook for managing WebRTC connection to OpenAI Realtime API
 */
export function useWebRTCRealtime(
  options: UseWebRTCRealtimeOptions = {}
): UseWebRTCRealtimeReturn {
  const { onTranscript, onEvent, onError, onToolCall } = options;
  const { realtimeVoice, apiBaseUrl } = useSettings();
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const peerConnectionRef = useRef<any>(null);
  const dataChannelRef = useRef<any>(null);
  const localMediaStreamRef = useRef<any>(null);
  const remoteMediaStreamRef = useRef<any>(null);
  const audioTrackRef = useRef<any>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const sendEvent = useCallback((event: any) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify(event));
    } else {
      console.warn('[useWebRTCRealtime] Cannot send event: data channel not open');
    }
  }, []);

  const startSession = useCallback(async () => {
    // Check if WebRTC is available
    if (!RTCPeerConnection || !mediaDevices || !MediaStream) {
      const errorMsg = Platform.OS === 'web' 
        ? 'WebRTC is not supported in this browser'
        : 'WebRTC native modules are not available. Please use a development build instead of Expo Go.';
      console.error('[useWebRTCRealtime]', errorMsg);
      onError?.(new Error(errorMsg));
      return;
    }

    try {
      // Get ephemeral token from backend with selected voice
      const tokenData = await getRealtimeToken(realtimeVoice);
      const ephemeralKey = tokenData.client_secret.value;
      console.log('[useWebRTCRealtime] Got ephemeral token with voice:', realtimeVoice);

      // Enable audio
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      
      // Start InCallManager and force speaker (native only)
      if (Platform.OS !== 'web' && InCallManager) {
        InCallManager.start({ media: 'audio' });
        InCallManager.setForceSpeakerphoneOn(true);
      }

      // Create peer connection
      const pc = new RTCPeerConnection();
      
      // Set up event listeners
      pc.addEventListener('connectionstatechange', (_e: any) => {
        console.log('[useWebRTCRealtime] Connection state:', pc.connectionState);
      });

      pc.addEventListener('iceconnectionstatechange', (_e: any) => {
        console.log('[useWebRTCRealtime] ICE connection state:', pc.iceConnectionState);
      });

      // Initialize remote media stream if not already done
      if (!remoteMediaStreamRef.current && MediaStream) {
        remoteMediaStreamRef.current = new MediaStream();
      }

      pc.addEventListener('track', (event: any) => {
        if (event.track && remoteMediaStreamRef.current) {
          console.log('[useWebRTCRealtime] Remote track received:', event.track.kind);
          remoteMediaStreamRef.current.addTrack(event.track);
          
          // Play remote audio on web
          if (Platform.OS === 'web' && event.track.kind === 'audio') {
            const remoteAudio = document.createElement('audio');
            remoteAudio.autoplay = true;
            remoteAudio.srcObject = remoteMediaStreamRef.current as any;
            remoteAudioRef.current = remoteAudio;
            console.log('[useWebRTCRealtime] Remote audio element created for playback');
          }
        }
      });

      // Add local audio track for microphone input
      // Request audio with specific constraints to ensure it works
      const ms = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        } as any, // Type definition may be limited, but browser supports this
      });
      
      console.log('[useWebRTCRealtime] Got media stream with tracks:', {
        audioTracks: ms.getAudioTracks ? ms.getAudioTracks().length : ms.getTracks().filter((t: any) => t.kind === 'audio').length,
        videoTracks: ms.getVideoTracks().length,
        allTracks: ms.getTracks().length,
      });
      
      // Disable video track if present (voice only)
      const videoTracks = ms.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = false;
      }

      // Get audio tracks explicitly (with fallback for web compatibility)
      const audioTracks = ms.getAudioTracks ? ms.getAudioTracks() : ms.getTracks().filter((t: any) => t.kind === 'audio');
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available from microphone');
      }

      // Ensure audio track is enabled and unmuted
      const audioTrack = audioTracks[0];
      audioTrack.enabled = true;
      
      // Explicitly unmute the track (web browsers may mute by default)
      if ((audioTrack as any).muted !== undefined) {
        // Can't directly set muted, but we can ensure enabled is true
        console.log('[useWebRTCRealtime] Audio track muted state:', (audioTrack as any).muted);
      }
      
      // Set track constraints to ensure it's active
      if ((audioTrack as any).applyConstraints) {
        try {
          await (audioTrack as any).applyConstraints({ enabled: true });
        } catch (err) {
          console.warn('[useWebRTCRealtime] Could not apply constraints:', err);
        }
      }
      
      audioTrackRef.current = audioTrack;
      
      // Log comprehensive track state
      console.log('[useWebRTCRealtime] Audio track state:', {
        kind: audioTrack.kind,
        enabled: audioTrack.enabled,
        muted: (audioTrack as any).muted || false,
        readyState: (audioTrack as any).readyState || 'unknown',
        id: (audioTrack as any).id || 'unknown',
        settings: (audioTrack as any).getSettings ? (audioTrack as any).getSettings() : 'not available',
      });
      
      // Add event listeners to track state changes
      if ((audioTrack as any).addEventListener) {
        (audioTrack as any).addEventListener('mute', () => {
          console.warn('[useWebRTCRealtime] ⚠️ Audio track was muted!');
        });
        (audioTrack as any).addEventListener('unmute', () => {
          console.log('[useWebRTCRealtime] ✅ Audio track was unmuted');
        });
        (audioTrack as any).addEventListener('ended', () => {
          console.warn('[useWebRTCRealtime] ⚠️ Audio track ended!');
        });
      }

      // Monitor audio levels via WebRTC stats (web only)
      if (Platform.OS === 'web') {
        let statsCheckCount = 0;
        const checkAudioLevels = async () => {
          try {
            statsCheckCount++;
            const stats = await (pc as any).getStats();
            let audioInputLevel = 0;
            let bytesSent = 0;
            let packetsSent = 0;
            
            let trackId = null;
            stats.forEach((report: any) => {
              if (report.type === 'media-source' && report.kind === 'audio') {
                audioInputLevel = report.audioLevel || 0;
                trackId = report.trackIdentifier || report.id;
              }
              if (report.type === 'outbound-rtp' && report.kind === 'audio') {
                bytesSent = report.bytesSent || 0;
                packetsSent = report.packetsSent || 0;
              }
            });
            
            // Also check the actual track state
            const trackState = audioTrackRef.current ? {
              enabled: audioTrackRef.current.enabled,
              muted: (audioTrackRef.current as any).muted || false,
              readyState: (audioTrackRef.current as any).readyState || 'unknown',
              settings: (audioTrackRef.current as any).getSettings ? (audioTrackRef.current as any).getSettings() : null,
            } : null;
            
            if (statsCheckCount % 4 === 0 || audioInputLevel > 0 || bytesSent > 0) {
              console.log(`[useWebRTCRealtime] 📊 Stats check #${statsCheckCount}:`, {
                audioLevel: audioInputLevel,
                bytesSent,
                packetsSent,
                hasData: bytesSent > 0 || packetsSent > 0,
                trackState: trackState ? {
                  ...trackState,
                  settings: trackState.settings ? {
                    deviceId: trackState.settings.deviceId,
                    groupId: trackState.settings.groupId,
                    echoCancellation: trackState.settings.echoCancellation,
                    noiseSuppression: trackState.settings.noiseSuppression,
                    autoGainControl: trackState.settings.autoGainControl,
                  } : null,
                } : null,
                trackId,
              });
              
              // Warn if sending data but audio level is 0 (sending silence)
              if (bytesSent > 0 && audioInputLevel === 0 && statsCheckCount > 2) {
                const mutedStatus = trackState?.muted ? 'MUTED' : 'not muted';
                console.warn(`[useWebRTCRealtime] ⚠️ Sending audio packets but audio level is 0 - Track is ${mutedStatus}. Check:`);
                console.warn('  1. Browser microphone permissions (check address bar icon)');
                console.warn('  2. System microphone settings (may be muted)');
                console.warn('  3. Microphone hardware (try another app to test)');
                console.warn('  4. Track state:', trackState);
              }
            }
          } catch (err) {
            if (statsCheckCount === 1) {
              console.warn('[useWebRTCRealtime] Stats not available yet:', err);
            }
          }
        };
        // Start checking after connection is established
        setTimeout(() => {
          audioLevelIntervalRef.current = setInterval(checkAudioLevels, 2000);
        }, 2000);
      }

      localMediaStreamRef.current = ms;
      pc.addTrack(audioTrack);

      // Set up data channel for sending and receiving events
      const dc = pc.createDataChannel('oai-events');
      dataChannelRef.current = dc;

      // Configure data channel event listeners
      dc.addEventListener('open', () => {
        console.log('[useWebRTCRealtime] Data channel opened');
        setIsSessionActive(true);
        
        // Verify audio track is still enabled
        if (audioTrackRef.current) {
          console.log('[useWebRTCRealtime] Audio track state on data channel open:', {
            kind: audioTrackRef.current.kind,
            enabled: audioTrackRef.current.enabled,
            readyState: (audioTrackRef.current as any).readyState || 'unknown',
          });
        }
        
        // Configure session with instructions and tools
        // Use async IIFE to fetch pump config
        (async () => {
          // Fetch pump configuration to include in instructions
          let availableIngredients: string[] = [];
          try {
            const userId = await AsyncStorage.getItem('user_id');
            if (userId) {
              const { API_BASE_URL } = await import('@/environment');
              const apiUrl = apiBaseUrl || API_BASE_URL;
              const response = await fetch(`${apiUrl}/iot/pump-config?user_id=${encodeURIComponent(userId)}`);
              if (response.ok) {
                const config = await response.json();
                const ingredients = [config.pump1, config.pump2, config.pump3]
                  .filter((ing: string | null) => ing && ing.trim())
                  .map((ing: string) => ing.trim());
                availableIngredients = ingredients;
                console.log('[useWebRTCRealtime] Loaded pump config with ingredients:', ingredients);
              }
            }
          } catch (error) {
            console.warn('[useWebRTCRealtime] Failed to load pump config:', error);
            // Continue without pump config - instructions will be generic
          }

          // Build dynamic instructions based on available ingredients
          let instructionsText = 'You are a helpful bartender assistant. Help customers with drink orders and provide friendly service. ';
          
          if (availableIngredients.length > 0) {
            const ingredientsList = availableIngredients.join(', ');
            instructionsText += `The user has the following ingredients available in their pumps: ${ingredientsList}. `;
            instructionsText += 'Only suggest or generate drinks that can be made with these ingredients. ';
            instructionsText += 'If a user requests a drink with unavailable ingredients, politely suggest alternatives using only the available ingredients. ';
            instructionsText += `When a user asks you to generate or create a drink, you MUST automatically use the generate_drink tool with the available_ingredients parameter set to these ingredients: ${ingredientsList}. Do NOT ask the user what ingredients they have - you already know from their pump configuration. `;
            instructionsText += 'When using the generate_drink function, you MUST include the available_ingredients parameter with these ingredients. ';
          } else {
            instructionsText += 'The user has not configured their pumps yet, so you can suggest any drinks. ';
          }
          
          instructionsText += 'If a user wants to create a custom drink, use the generate_drink tool to create it with an AI-generated image. ';
          instructionsText += 'If a user is being mean, rude, abusive, or disrespectful to you, use the kick_user_out tool to end the conversation.';

          const toolsSchema = [
            {
              type: 'function',
              name: 'kick_user_out',
              description: 'Call this function when the user is being mean, rude, abusive, or disrespectful to the bartender. This will end the conversation and return the user to the chat page.',
            },
            {
              type: 'function',
              name: 'generate_drink',
              description: 'Generate a new drink with an AI-generated image. Use this when the user wants to create a custom drink. You should extract the drink name, category, ingredients list, instructions, difficulty level (Easy, Medium, or Hard), and prep time from the conversation.',
              parameters: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The name of the drink',
                  },
                  category: {
                    type: 'string',
                    description: 'The category of the drink (e.g., Cocktail, Mocktail, Shot, etc.)',
                  },
                  ingredients: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of ingredients needed for the drink',
                  },
                  instructions: {
                    type: 'string',
                    description: 'Step-by-step instructions for making the drink',
                  },
                  difficulty: {
                    type: 'string',
                    enum: ['Easy', 'Medium', 'Hard'],
                    description: 'The difficulty level of making this drink',
                  },
                  prepTime: {
                    type: 'string',
                    description: 'The preparation time (e.g., "5 minutes", "10-15 minutes")',
                  },
                  user_id: {
                    type: 'string',
                    description: 'The user ID who is creating this drink (optional, defaults to "guest")',
                  },
                  available_ingredients: {
                    type: 'array',
                    items: { type: 'string' },
                    maxItems: 3,
                    description: `List of available ingredients in the user's configured pumps (max 3). These are in snake_case format (e.g., 'water', 'sprite', 'rc_cola'). You MUST only use ingredients from this list when creating the drink.${availableIngredients.length > 0 ? ` Current available ingredients: ${availableIngredients.slice(0, 3).join(', ')}.` : ' If not provided, you can use any ingredients.'}`,
                  },
                },
                required: ['name', 'category', 'ingredients', 'instructions', 'difficulty', 'prepTime'],
              },
            },
          ];

          const sessionUpdateEvent = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: instructionsText,
              tools: toolsSchema,
            },
          };
          console.log('[useWebRTCRealtime] Sending session.update with audio modality and tools');
          dc.send(JSON.stringify(sessionUpdateEvent));
        })();
        
        // After a short delay, verify audio is working by checking track state
        setTimeout(() => {
          if (audioTrackRef.current) {
            const track = audioTrackRef.current;
            console.log('[useWebRTCRealtime] Audio track verification:', {
              kind: track.kind,
              enabled: track.enabled,
              muted: (track as any).muted || false,
              readyState: (track as any).readyState || 'unknown',
            });
            
            // On web, try to get audio context to verify microphone access
            if (Platform.OS === 'web') {
              try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                const source = audioContext.createMediaStreamSource(ms as any);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.8;
                source.connect(analyser);
                
                let checkCount = 0;
                const checkLevel = () => {
                  checkCount++;
                  const dataArray = new Uint8Array(analyser.frequencyBinCount);
                  analyser.getByteFrequencyData(dataArray);
                  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                  const max = Math.max(...Array.from(dataArray));
                  
                  // Log every check, but highlight when audio is detected
                  if (checkCount % 5 === 0 || average > 1) {
                    console.log(`[useWebRTCRealtime] 🎙️ Audio level check #${checkCount}: avg=${average.toFixed(2)}, max=${max}`);
                  }
                  
                  if (average > 5) {
                    console.log('[useWebRTCRealtime] 🔊 Audio input detected! Level:', average.toFixed(2), 'Max:', max);
                  }
                };
                
                console.log('[useWebRTCRealtime] Starting audio level monitoring...');
                const levelCheckInterval = setInterval(checkLevel, 500); // Check every 500ms
                
                setTimeout(() => {
                  clearInterval(levelCheckInterval);
                  audioContext.close();
                  console.log('[useWebRTCRealtime] Audio level monitoring stopped');
                }, 30000); // Monitor for 30 seconds
              } catch (err) {
                console.warn('[useWebRTCRealtime] Could not create audio analyser:', err);
              }
            }
          }
        }, 1000);
      });

      dc.addEventListener('message', async (e: any) => {
        try {
          const data = JSON.parse(e.data);
          console.log('[useWebRTCRealtime] Data channel message:', data);
          
          // Log audio-related events from OpenAI
          if (data.type?.includes('audio') || data.type?.includes('input_audio') || data.type?.includes('speech')) {
            console.log('[useWebRTCRealtime] 🎤 Audio event from OpenAI:', data.type, data);
          }
          
          // Call onEvent callback
          onEvent?.(data);
          
          // Handle transcript updates
          if (data.type === 'response.audio_transcript.done') {
            console.log('[useWebRTCRealtime] ✅ Transcript received:', data.transcript);
            onTranscript?.(data.transcript);
          }
          
          // Handle partial transcripts
          if (data.type === 'response.audio_transcript.delta') {
            console.log('[useWebRTCRealtime] 📝 Partial transcript:', data.delta);
          }
          
          // Handle function calls
          if (data.type === 'response.function_call_arguments.done') {
            const functionName = data.name;
            const functionArgs = data.arguments ? JSON.parse(data.arguments) : {};
            const callId = data.call_id;
            
            console.log('[useWebRTCRealtime] 🔧 Function call received:', functionName, functionArgs);
            
            // Call the tool handler if provided
            if (onToolCall) {
              try {
                const result = await onToolCall(functionName, functionArgs);
                
                // Send function call output back to OpenAI
                const outputEvent = {
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: JSON.stringify(result),
                  },
                };
                dc.send(JSON.stringify(outputEvent));
                console.log('[useWebRTCRealtime] ✅ Function call output sent:', result);
                
                // Force a response to the user
                dc.send(JSON.stringify({
                  type: 'response.create',
                }));
              } catch (error) {
                console.error('[useWebRTCRealtime] Error executing tool:', error);
                // Send error back to OpenAI
                const errorEvent = {
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
                  },
                };
                dc.send(JSON.stringify(errorEvent));
              }
            } else {
              console.warn('[useWebRTCRealtime] Function call received but no onToolCall handler provided');
            }
          }
        } catch (error) {
          console.error('[useWebRTCRealtime] Error parsing data channel message:', error);
        }
      });

      dc.addEventListener('error', (_error: any) => {
        console.error('[useWebRTCRealtime] Data channel error');
        onError?.(new Error('Data channel error'));
      });

      // Create offer and connect to OpenAI
      // The offer will automatically include audio tracks we've added
      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);
      
      console.log('[useWebRTCRealtime] Local description set, SDP includes audio:', offer.sdp?.includes('audio'));
      console.log('[useWebRTCRealtime] SDP preview:', offer.sdp?.substring(0, 200));

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`Failed to connect to OpenAI: ${sdpResponse.status} - ${errorText}`);
      }

      const answer: any = {
        type: 'answer',
        sdp: await sdpResponse.text(),
      };
      
      await pc.setRemoteDescription(answer);

      peerConnectionRef.current = pc;
      console.log('[useWebRTCRealtime] Session started successfully');
    } catch (error) {
      console.error('[useWebRTCRealtime] Error starting session:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
      
      // Clean up on error - use inline cleanup to avoid dependency
      if (Platform.OS !== 'web' && InCallManager) {
        InCallManager.stop();
      }
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localMediaStreamRef.current) {
        localMediaStreamRef.current.getTracks().forEach((track: any) => track.stop());
        localMediaStreamRef.current = null;
      }
      setIsSessionActive(false);
    }
  }, [onTranscript, onEvent, onError, onToolCall, realtimeVoice, apiBaseUrl]);

  const stopSession = useCallback(() => {
    console.log('[useWebRTCRealtime] Stopping session');
    
    // Stop audio level monitoring
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    
    // Stop remote audio playback (web)
    if (Platform.OS === 'web' && remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
    
    // Stop InCallManager (native only)
    if (Platform.OS !== 'web' && InCallManager) {
      InCallManager.stop();
    }
    
    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Stop local media stream
    if (localMediaStreamRef.current) {
      localMediaStreamRef.current.getTracks().forEach((track: any) => track.stop());
      localMediaStreamRef.current = null;
    }
    
    audioTrackRef.current = null;
    setIsSessionActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return {
    isSessionActive,
    startSession,
    stopSession,
    sendEvent,
  };
}

