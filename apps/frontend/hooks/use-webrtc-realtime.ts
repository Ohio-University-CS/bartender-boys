import { useState, useRef, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import InCallManager from 'react-native-incall-manager';
import {
  mediaDevices,
  RTCPeerConnection,
  MediaStream,
} from 'react-native-webrtc-web-shim';
import { getRealtimeToken } from '@/utils/realtime';

export interface UseWebRTCRealtimeOptions {
  onTranscript?: (transcript: string) => void;
  onEvent?: (event: any) => void;
  onError?: (error: Error) => void;
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
  const { onTranscript, onEvent, onError } = options;
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<ReturnType<RTCPeerConnection['createDataChannel']> | null>(null);
  const localMediaStreamRef = useRef<MediaStream | null>(null);
  const remoteMediaStreamRef = useRef<MediaStream>(new MediaStream());
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
    try {
      // Get ephemeral token from backend
      const tokenData = await getRealtimeToken();
      const ephemeralKey = tokenData.client_secret.value;
      console.log('[useWebRTCRealtime] Got ephemeral token');

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

      pc.addEventListener('track', (event: any) => {
        if (event.track) {
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
        
        // Configure session with instructions
        const sessionUpdateEvent = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a helpful bartender assistant. Help customers with drink orders and provide friendly service.',
          },
        };
        console.log('[useWebRTCRealtime] Sending session.update with audio modality');
        dc.send(JSON.stringify(sessionUpdateEvent));
        
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

      dc.addEventListener('message', (e: any) => {
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
  }, [onTranscript, onEvent, onError]);

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

