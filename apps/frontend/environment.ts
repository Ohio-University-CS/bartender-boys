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
  if (fromHostUri && fromHostUri !== '127.0.0.1' && fromHostUri !== 'localhost') {
    console.log('[environment] Detected IP from hostUri:', fromHostUri);
    return fromHostUri;
  }

  // 2) Try Metro bundle URL (this works for physical devices)
  // The scriptURL from Metro bundler contains the correct IP when running on physical device
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
  if (scriptURL) {
    console.log('[environment] Script URL:', scriptURL);
    const fromScript = getHostFromUri(scriptURL);
    if (fromScript && fromScript !== '127.0.0.1' && fromScript !== 'localhost') {
      console.log('[environment] Detected IP from scriptURL:', fromScript);
      return fromScript;
    }
    // If scriptURL contains localhost, we're in simulator
    if (fromScript === '127.0.0.1' || fromScript === 'localhost') {
      console.log('[environment] Running in simulator, using localhost');
      return '127.0.0.1';
    }
  }

  // 3) Emulator special-cases
  if (Platform.OS === 'android') {
    console.log('[environment] Android emulator, using 10.0.2.2');
    return '10.0.2.2';
  }
  
  // 4) For iOS physical devices, if we can't detect, return null
  // This allows manual override via settings
  console.warn('[environment] Could not auto-detect IP, will use settings override or fallback');
  return null;
}

// Allow manual override via env (e.g., EAS env vars)
const MANUAL_API_BASE_URL = (process.env as any)?.API_BASE_URL as string | undefined;

const DEV_HOST_IP = resolveDevHostIp();
// For iOS physical devices, if we can't auto-detect, try common network IPs
// or use manual override. The user can set API_BASE_URL in settings.
const NETWORK_IP = DEV_HOST_IP || (Platform.OS === 'ios' ? null : '127.0.0.1');

// Development configuration
// For iOS physical devices, if NETWORK_IP is null, we'll need to rely on
// the settings context or manual API_BASE_URL override
const getApiBaseUrl = (): string => {
  if (MANUAL_API_BASE_URL) {
    console.log('[environment] Using manual API_BASE_URL:', MANUAL_API_BASE_URL);
    return MANUAL_API_BASE_URL;
  }
  if (NETWORK_IP) {
    const url = `http://${NETWORK_IP}:8000`;
    console.log('[environment] Using detected IP:', url);
    return url;
  }
  // Fallback: try to get from Expo Constants (should have the correct IP)
  const hostUri = (Constants as any)?.expoConfig?.hostUri
    || (Constants as any)?.manifest2?.extra?.expoClient?.hostUri
    || (Constants as any)?.manifest?.hostUri;
  if (hostUri) {
    const host = getHostFromUri(hostUri);
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      const url = `http://${host}:8000`;
      console.log('[environment] Using IP from Constants:', url);
      return url;
    }
  }
  // Last resort: use localhost (will only work in simulator)
  console.warn('[environment] Using fallback localhost (may not work on physical device)');
  return 'http://127.0.0.1:8000';
};

const DEV_CONFIG = {
  API_BASE_URL: getApiBaseUrl(),
};

// Log the final API URL for debugging
console.log('[environment] Final API_BASE_URL:', DEV_CONFIG.API_BASE_URL);

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
