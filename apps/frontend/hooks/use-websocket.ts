import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/environment';
import { useSettings } from '@/contexts/settings';

export interface WebSocketMessage {
  type: string;
  payload?: any;
  [key: string]: any;
}

export interface UseWebSocketOptions {
  clientId: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: WebSocketMessage) => void;
}

/**
 * React hook for managing WebSocket connections
 */
export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    clientId,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoConnect = true,
  } = options;

  const { apiBaseUrl } = useSettings();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  
  // Store callbacks in refs to avoid dependency issues
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  }, [onMessage, onConnect, onDisconnect, onError]);

  // Get WebSocket URL from settings API base URL or fallback to environment
  const getWebSocketUrl = useCallback(() => {
    const baseUrl = (apiBaseUrl || API_BASE_URL).replace(/^http/, 'ws');
    return `${baseUrl}/openai/realtime/${clientId}`;
  }, [clientId, apiBaseUrl]);

  const connect = useCallback(() => {
    // Don't connect if already connected or if reconnect is disabled
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[useWebSocket] Already connected');
      return;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const url = getWebSocketUrl();
    console.log('[useWebSocket] Connecting to:', url);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useWebSocket] Connected');
        setIsConnected(true);
        shouldReconnectRef.current = true;
        onConnectRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[useWebSocket] Message received:', message);
          onMessageRef.current?.(message);
        } catch (error) {
          console.error('[useWebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[useWebSocket] WebSocket error:', error);
        onErrorRef.current?.(error);
      };

      ws.onclose = (event) => {
        console.log('[useWebSocket] Disconnected', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        setIsConnected(false);
        wsRef.current = null;
        onDisconnectRef.current?.();

        // Attempt to reconnect if not a clean close and reconnect is enabled
        if (shouldReconnectRef.current && !event.wasClean) {
          console.log('[useWebSocket] Will attempt to reconnect in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldReconnectRef.current) {
              connect();
            }
          }, 3000);
        }
      };
    } catch (error) {
      console.error('[useWebSocket] Error creating WebSocket:', error);
      setIsConnected(false);
    }
  }, [getWebSocketUrl]);

  const disconnect = useCallback(() => {
    console.log('[useWebSocket] Disconnecting...');
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const jsonMessage = JSON.stringify(message);
        wsRef.current.send(jsonMessage);
        console.log('[useWebSocket] Message sent:', message);
      } catch (error) {
        console.error('[useWebSocket] Error sending message:', error);
      }
    } else {
      console.warn('[useWebSocket] Cannot send message: WebSocket not connected');
    }
  }, []);

  // Auto-connect on mount if enabled, and reconnect when apiBaseUrl or clientId changes
  useEffect(() => {
    if (!autoConnect || !clientId) {
      return;
    }

    // Disconnect existing connection if any
    if (wsRef.current) {
      shouldReconnectRef.current = false;
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
      setIsConnected(false);
    }

    // Connect to the new URL
    const url = getWebSocketUrl();
    console.log('[useWebSocket] Connecting to:', url);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      shouldReconnectRef.current = true;

      ws.onopen = () => {
        console.log('[useWebSocket] Connected');
        setIsConnected(true);
        shouldReconnectRef.current = true;
        onConnectRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[useWebSocket] Message received:', message);
          onMessageRef.current?.(message);
        } catch (error) {
          console.error('[useWebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[useWebSocket] WebSocket error:', error);
        onErrorRef.current?.(error);
      };

      ws.onclose = (event) => {
        console.log('[useWebSocket] Disconnected', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        setIsConnected(false);
        wsRef.current = null;
        onDisconnectRef.current?.();

        // Attempt to reconnect if not a clean close and reconnect is enabled
        if (shouldReconnectRef.current && !event.wasClean) {
          console.log('[useWebSocket] Will attempt to reconnect in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldReconnectRef.current) {
              connect();
            }
          }, 3000);
        }
      };
    } catch (error) {
      console.error('[useWebSocket] Error creating WebSocket:', error);
      setIsConnected(false);
    }

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [autoConnect, clientId, apiBaseUrl, getWebSocketUrl]);

  return {
    isConnected,
    connect,
    disconnect,
    sendMessage,
  };
}
