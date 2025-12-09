/**
 * Unit tests for theme utilities
 */

import { createThemeColors, isAccentOption, resolveColorValue } from '@/constants/theme';

describe('Theme Utilities', () => {
  /**
   * Test 1: Normal case - createThemeColors with valid accent
   * Verifies that createThemeColors returns correct color structure
   */
  test('should create theme colors for valid accent option', () => {
    const colors = createThemeColors('sunset');
    expect(colors.light.tint.toLowerCase()).toBe('#ffa600');
    expect(colors.dark.tint.toLowerCase()).toBe('#ffb833');
  });

  /**
   * Test 2: Edge case - isAccentOption with invalid values
   * Verifies that isAccentOption returns false for invalid accent options
   */
  test('should reject invalid accent options', () => {
    expect(isAccentOption('invalid')).toBe(false);
    expect(isAccentOption('')).toBe(false);
    expect(isAccentOption('sunset')).toBe(true);
  });

  /**
   * Test 3: Normal case - resolveColorValue
   * Verifies that resolveColorValue returns correct color for mode and accent
   */
  test('should resolve color values correctly', () => {
    const lightText = resolveColorValue('light', 'sunset', 'text');
    const darkText = resolveColorValue('dark', 'sunset', 'text');
    expect(lightText.toLowerCase()).toBe('#12171c');
    expect(darkText.toLowerCase()).toBe('#ecedee');
  });
});
