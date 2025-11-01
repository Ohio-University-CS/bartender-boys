/**
 * Unit tests for useThemeColor hook
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@/contexts/settings', () => ({
  useSettings: jest.fn(() => ({
    accentColor: 'sunset',
  })),
}));

jest.mock('@/constants/theme', () => ({
  createThemeColors: jest.fn((accent: string) => ({
    light: { text: '#11181C', tint: '#FFA500' },
    dark: { text: '#ECEDEE', tint: '#FFB347' },
  })),
  Colors: {
    light: { text: '#11181C', tint: '#FFA500' },
    dark: { text: '#ECEDEE', tint: '#FFB347' },
  },
}));

const TestComponent = ({ 
  colorName, 
  lightColor,
  onColor 
}: { 
  colorName: keyof typeof import('@/constants/theme').Colors.light;
  lightColor?: string;
  onColor: (color: string) => void;
}) => {
  const color = useThemeColor({ light: lightColor }, colorName);
  React.useEffect(() => {
    onColor(color);
  }, [color]);
  return null;
};

describe('useThemeColor Hook', () => {
  /**
   * Test 1: Normal case - Resolving color from colorName
   * Verifies that useThemeColor returns correct color for given colorName
   */
  test('should resolve color from colorName', () => {
    let resolvedColor = '';
    render(
      <TestComponent 
        colorName="text" 
        onColor={(color) => { resolvedColor = color; }}
      />
    );
    expect(resolvedColor).toBe('#11181C');
  });

  /**
   * Test 2: Normal case - Custom light color override
   * Verifies that lightColor prop takes precedence over theme color
   */
  test('should use custom light color when provided', () => {
    let resolvedColor = '';
    render(
      <TestComponent 
        colorName="text"
        lightColor="#FF0000"
        onColor={(color) => { resolvedColor = color; }}
      />
    );
    expect(resolvedColor).toBe('#FF0000');
  });

  /**
   * Test 3: Edge case - Fallback to Colors object
   * Verifies that Colors object is used when accent preset doesn't have the color
   */
  test('should fallback to Colors when accent preset missing color', () => {
    const { createThemeColors } = require('@/constants/theme');
    createThemeColors.mockReturnValue({
      light: { text: '#11181C' },
      dark: { text: '#ECEDEE' },
    });
    
    let color = '';
    render(
      <TestComponent 
        colorName="tint"
        onColor={(c) => { color = c; }}
      />
    );
    expect(color).toBe('#FFA500');
  });
});
