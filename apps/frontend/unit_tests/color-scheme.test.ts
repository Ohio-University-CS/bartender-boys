/**
 * Color scheme hook tests
 *
 * Tests the useColorScheme hook that determines the current
 * color scheme (light/dark/system) based on settings and system preferences.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock React Native's useColorScheme
const mockRNColorScheme = vi.fn();
vi.mock('react-native', () => ({
  useColorScheme: () => mockRNColorScheme(),
}));

// Mock settings context
const mockSettings = { theme: 'system' as const };
vi.mock('@/contexts/settings', () => ({
  useSettings: () => mockSettings,
}));

import { useColorScheme } from '@/hooks/use-color-scheme';

describe('useColorScheme() with system theme', () => {
  beforeEach(() => {
    mockSettings.theme = 'system';
    vi.clearAllMocks();
  });

  // Normal case: returns system color scheme when theme is 'system'
  test('should return system color scheme when theme is set to system', () => {
    mockRNColorScheme.mockReturnValue('dark');
    const result = useColorScheme();
    expect(result).toBe('dark');
  });

  // Edge case: handles null system color scheme
  test('should return null when system color scheme is null', () => {
    mockRNColorScheme.mockReturnValue(null);
    const result = useColorScheme();
    expect(result).toBeNull();
  });

  // Error case: handles undefined system color scheme
  test('should return null when system color scheme is undefined', () => {
    mockRNColorScheme.mockReturnValue(undefined);
    const result = useColorScheme();
    expect(result).toBeNull();
  });
});

describe('useColorScheme() with explicit theme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Normal case: returns light when theme is explicitly set to light
  test('should return light when theme is explicitly set to light', () => {
    mockSettings.theme = 'light';
    const result = useColorScheme();
    expect(result).toBe('light');
  });

  // Edge case: returns dark when theme is explicitly set to dark
  test('should return dark when theme is explicitly set to dark', () => {
    mockSettings.theme = 'dark';
    const result = useColorScheme();
    expect(result).toBe('dark');
  });

  // Error case: ignores system preference when explicit theme is set
  test('should ignore system preference when explicit theme is set', () => {
    mockSettings.theme = 'light';
    mockRNColorScheme.mockReturnValue('dark');
    const result = useColorScheme();
    // Result should be the explicit theme, not the system preference
    expect(result).toBe('light');
    // Note: The hook still calls useRNColorScheme, but returns the explicit theme
    expect(result).not.toBe('dark');
  });
});

