declare module 'react-native-webrtc-web-shim' {
  export const mediaDevices: {
    getUserMedia(constraints: { audio?: boolean; video?: boolean }): Promise<MediaStream>;
  };
  
  export class RTCPeerConnection {
    connectionState?: string;
    iceConnectionState?: string;
    addEventListener(event: 'connectionstatechange' | 'iceconnectionstatechange' | 'track', listener: (event: Event | RTCTrackEvent) => void): void;
    createOffer(options?: {}): Promise<RTCSessionDescriptionInit>;
    setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
    setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
    createDataChannel(label: string): RTCDataChannel;
    addTrack(track: MediaStreamTrack): void;
    close(): void;
  }
  
  export class MediaStream {
    getTracks(): MediaStreamTrack[];
    getAudioTracks(): MediaStreamTrack[];
    getVideoTracks(): MediaStreamTrack[];
    addTrack(track: MediaStreamTrack): void;
  }
  
  export interface MediaStreamTrack {
    kind: 'audio' | 'video';
    enabled: boolean;
    stop(): void;
  }
  
  export interface RTCDataChannel {
    readyState: 'open' | 'closed' | 'connecting' | 'closing';
    send(data: string): void;
    close(): void;
    addEventListener(event: 'open' | 'message' | 'error', listener: (event: Event | MessageEvent) => void): void;
  }
  
  export interface RTCTrackEvent {
    track: MediaStreamTrack | null;
  }
}

