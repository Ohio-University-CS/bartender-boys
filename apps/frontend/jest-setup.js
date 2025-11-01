// Jest setup file for React Native/Expo
// This file runs before each test file

// Mock React Native modules that may not be available in test environment
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return RN;
});

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {},
    manifest2: {},
    manifest: {},
  },
}));

// Mock environment module
jest.mock('@/environment', () => ({
  IS_PROD: false,
  API_BASE_URL: 'http://localhost:8000',
  NETWORK_IP: '127.0.0.1',
}));

