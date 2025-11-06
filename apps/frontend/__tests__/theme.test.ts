/**
 * Theme tests
 *
 * Verifies theme color constants and structure.
 * Note: useThemeColor is a React hook and requires component context,
 * so we test the Colors constants directly.
 */
import { describe, test, expect, vi } from 'vitest';

// Mock React Native Platform before importing theme
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: (obj: any) => obj.ios || obj.default || obj,
  },
}));

import { Colors } from '@/constants/theme';

describe('Colors object structure', () => {
  // Normal case: Colors has both light and dark themes
  test('should have both light and dark theme objects', () => {
    expect(Colors.light).toBeDefined();
    expect(Colors.dark).toBeDefined();
    expect(typeof Colors.light).toBe('object');
    expect(typeof Colors.dark).toBe('object');
  });

  // Edge case: both themes have same color keys
  test('should have matching color keys in light and dark themes', () => {
    const lightKeys = Object.keys(Colors.light);
    const darkKeys = Object.keys(Colors.dark);
    expect(lightKeys.sort()).toEqual(darkKeys.sort());
  });

  // Error case: all color values should be valid hex or color strings
  test('should have valid color values in both themes', () => {
    const allColors = [...Object.values(Colors.light), ...Object.values(Colors.dark)];
    allColors.forEach(color => {
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });
  });
});
