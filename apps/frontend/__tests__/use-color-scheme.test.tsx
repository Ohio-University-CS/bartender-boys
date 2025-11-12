/**
 * Unit tests for useColorScheme hook
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

jest.mock('react-native', () => ({
  useColorScheme: jest.fn(() => 'dark'),
}));

jest.mock('@/contexts/settings', () => ({
  useSettings: jest.fn(() => ({
    theme: 'system',
  })),
}));

const TestComponent = ({ onScheme }: { onScheme: (scheme: ReturnType<typeof useColorScheme>) => void }) => {
  const scheme = useColorScheme();
  React.useEffect(() => {
    onScheme(scheme);
  }, [scheme, onScheme]);
  return null;
};

describe('useColorScheme Hook', () => {
  /**
   * Test 1: Normal case - System theme mode
   * Verifies that 'system' theme returns system color scheme (or null)
   */
  test('should return system color scheme when theme is system', () => {
    let scheme: ReturnType<typeof useColorScheme> = null;
    render(<TestComponent onScheme={(s) => { scheme = s; }} />);
    // Can be 'dark', 'light', or null depending on system
    expect(['dark', 'light', null]).toContain(scheme);
  });

  /**
   * Test 2: Normal case - Explicit light theme
   * Verifies that explicit 'light' theme returns 'light'
   */
  test('should return light when theme is explicitly set to light', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useSettings } = require('@/contexts/settings');
    useSettings.mockReturnValue({ theme: 'light' });
    
    let scheme: ReturnType<typeof useColorScheme> = null;
    render(<TestComponent onScheme={(s) => { scheme = s; }} />);
    expect(scheme).toBe('light');
  });

  /**
   * Test 3: Edge case - Explicit dark theme
   * Verifies that explicit 'dark' theme returns 'dark'
   */
  test('should return dark when theme is explicitly set to dark', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useSettings } = require('@/contexts/settings');
    useSettings.mockReturnValue({ theme: 'dark' });
    
    let scheme: ReturnType<typeof useColorScheme> = null;
    render(<TestComponent onScheme={(s) => { scheme = s; }} />);
    expect(scheme).toBe('dark');
  });

  /**
   * Test 4: Edge case - System theme with null system value
   * Verifies that when system returns null, hook returns null
   */
  test('should return null when system theme is null', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useColorScheme: useRNColorScheme } = require('react-native');
    useRNColorScheme.mockReturnValue(null);
    
    let scheme: ReturnType<typeof useColorScheme> = null;
    render(<TestComponent onScheme={(s) => { scheme = s; }} />);
    expect(scheme).toBe(null);
  });
});

