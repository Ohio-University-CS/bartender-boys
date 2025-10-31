import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

// Environment configuration
const isProd = false; // Set to true for production builds

function getHostFromUri(uri?: string | null): string | null {
  if (!uri) return null;
  try {
    const url = new URL(uri.startsWith('http') ? uri : `http://${uri}`);
    return url.hostname || null;
  } catch {
    const hostPort = uri.split('//').pop() || uri;
    const host = hostPort.split(':')[0];
    return host || null;
  }
}

function resolveDevHostIp(): string | null {
  // 1) Try Expo hostUri (Expo Go / dev client over LAN)
  const hostUri = (Constants as any)?.expoConfig?.hostUri
    || (Constants as any)?.manifest2?.extra?.expoClient?.hostUri
    || (Constants as any)?.manifest?.hostUri;
  const fromHostUri = getHostFromUri(hostUri);
  if (fromHostUri) return fromHostUri;

  // 2) Try Metro bundle URL
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
  const fromScript = getHostFromUri(scriptURL || null);
  if (fromScript) return fromScript;

  // 3) Emulator special-cases
  if (Platform.OS === 'android') return '10.0.2.2';
  if (Platform.OS === 'ios') return '127.0.0.1';

  return null;
}

// Allow manual override via env (e.g., EAS env vars)
const MANUAL_API_BASE_URL = (process.env as any)?.API_BASE_URL as string | undefined;

const DEV_HOST_IP = resolveDevHostIp();
const NETWORK_IP = DEV_HOST_IP || '127.0.0.1';

// Development configuration
const DEV_CONFIG = {
  API_BASE_URL: MANUAL_API_BASE_URL || `http://${NETWORK_IP}:8000`,
};

// Production configuration
const PROD_CONFIG = {
  API_BASE_URL: 'https://your-production-api.com', // Replace with your production API URL
};

// Export the appropriate configuration based on environment
export const ENV = isProd ? PROD_CONFIG : DEV_CONFIG;

// Export individual values for convenience
export const API_BASE_URL = ENV.API_BASE_URL;
export const IS_PROD = isProd;
export { NETWORK_IP };
