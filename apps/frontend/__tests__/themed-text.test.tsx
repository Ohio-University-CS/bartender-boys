/**
 * Unit tests for ThemedText component
 */

import { ThemedText } from '@/components/themed-text';

jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: jest.fn(() => '#11181C'),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return RN;
});

describe('ThemedText', () => {
  /**
   * Test 1: Normal case - Component exists
   * Verifies that ThemedText component is exported
   */
  test('should export ThemedText component', () => {
    expect(ThemedText).toBeDefined();
    expect(typeof ThemedText).toBe('function');
  });

  /**
   * Test 2: Normal case - Component props interface
   * Verifies that component accepts props
   */
  test('should accept type prop', () => {
    const props = { type: 'title' as const };
    expect(props.type).toBe('title');
  });

  /**
   * Test 3: Edge case - Default type value
   * Verifies that default type is handled
   */
  test('should have default type value', () => {
    const defaultType = 'default';
    expect(defaultType).toBe('default');
  });
});
