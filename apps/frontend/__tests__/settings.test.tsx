/**
 * Unit tests for Settings context
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsProvider, useSettings } from '@/contexts/settings';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve(undefined)),
  removeItem: jest.fn(() => Promise.resolve(undefined)),
  multiRemove: jest.fn(() => Promise.resolve(undefined)),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    setEnabled: jest.fn(),
  },
}));

const TestComponent = ({ onSettings }: { onSettings: (settings: ReturnType<typeof useSettings>) => void }) => {
  const settings = useSettings();
  React.useEffect(() => {
    onSettings(settings);
  }, [settings]);
  return null;
};

describe('Settings Context', () => {
  let settingsState: ReturnType<typeof useSettings> | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    settingsState = null;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  /**
   * Test 1: Normal case - Setting theme preference
   * Verifies that setTheme() updates the theme correctly
   */
  test('should update theme preference', async () => {
    render(
      <SettingsProvider>
        <TestComponent onSettings={(s) => { settingsState = s; }} />
      </SettingsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      settingsState?.setTheme('light');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(settingsState?.theme).toBe('light');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('settings.theme', 'light');
  });

  /**
   * Test 2: Normal case - Setting accent color
   * Verifies that setAccentColor() updates the accent color
   */
  test('should update accent color', async () => {
    render(
      <SettingsProvider>
        <TestComponent onSettings={(s) => { settingsState = s; }} />
      </SettingsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      settingsState?.setAccentColor('ocean');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(settingsState?.accentColor).toBe('ocean');
  });

  /**
   * Test 3: Normal case - Resetting settings
   * Verifies that reset() restores default values
   */
  test('should reset to default settings', async () => {
    render(
      <SettingsProvider>
        <TestComponent onSettings={(s) => { settingsState = s; }} />
      </SettingsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      settingsState?.setTheme('light');
      settingsState?.setAccentColor('ocean');
      settingsState?.setApiBaseUrl('http://custom-url.com');
      await new Promise(resolve => setTimeout(resolve, 10));
      settingsState?.reset();
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(settingsState?.theme).toBe('dark');
    expect(settingsState?.accentColor).toBe('sunset');
    expect(settingsState?.apiBaseUrl).toBe('');
  });

  /**
   * Test 4: Normal case - Setting API base URL
   * Verifies that setApiBaseUrl() updates the API base URL
   */
  test('should update API base URL', async () => {
    render(
      <SettingsProvider>
        <TestComponent onSettings={(s) => { settingsState = s; }} />
      </SettingsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      settingsState?.setApiBaseUrl('http://localhost:8000');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(settingsState?.apiBaseUrl).toBe('http://localhost:8000');
  });

  /**
   * Test 5: Normal case - Setting haptics
   * Verifies that haptics settings can be updated
   */
  test('should update haptics settings', async () => {
    render(
      <SettingsProvider>
        <TestComponent onSettings={(s) => { settingsState = s; }} />
      </SettingsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      settingsState?.setHapticsEnabled(false);
      settingsState?.setHapticStrength('heavy');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(settingsState?.hapticsEnabled).toBe(false);
    expect(settingsState?.hapticStrength).toBe('heavy');
  });

  /**
   * Test 6: Normal case - Setting debug logs
   * Verifies that debug logs setting can be updated
   */
  test('should update debug logs setting', async () => {
    render(
      <SettingsProvider>
        <TestComponent onSettings={(s) => { settingsState = s; }} />
      </SettingsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      settingsState?.setDebugLogs(true);
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(settingsState?.debugLogs).toBe(true);
  });

  /**
   * Test 7: Normal case - Setting realtime voice
   * Verifies that realtime voice can be updated
   */
  test('should update realtime voice', async () => {
    render(
      <SettingsProvider>
        <TestComponent onSettings={(s) => { settingsState = s; }} />
      </SettingsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      settingsState?.setRealtimeVoice('coral');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(settingsState?.realtimeVoice).toBe('coral');
  });
});
