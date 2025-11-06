/**
 * Unit tests for getDrinkById function
 */

import { getDrinkById } from '@/constants/drinks';

describe('getDrinkById', () => {
  /**
   * Test 1: Normal case - Valid drink ID
   * Verifies that a valid drink ID returns the correct drink object
   */
  test('should return drink for valid ID', () => {
    const drink = getDrinkById('1');
    expect(drink).toBeDefined();
    expect(drink?.id).toBe('1');
    expect(drink?.name).toBe('Classic Margarita');
  });

  /**
   * Test 2: Edge case - Non-existent drink ID
   * Verifies that an invalid ID returns undefined
   */
  test('should return undefined for non-existent ID', () => {
    const drink = getDrinkById('999');
    expect(drink).toBeUndefined();
  });

  /**
   * Test 3: Error case - Empty string ID
   * Verifies that an empty string ID returns undefined
   */
  test('should return undefined for empty string ID', () => {
    const drink = getDrinkById('');
    expect(drink).toBeUndefined();
  });
});
