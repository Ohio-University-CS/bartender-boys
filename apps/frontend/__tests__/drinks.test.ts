/**
 * Unit tests for drinks constants and types
 */

import { DRINKS, getDrinkById, type Drink } from '@/constants/drinks';

describe('Drinks Constants', () => {
  /**
   * Test 1: Normal case - DRINKS array exists
   * Verifies that DRINKS is an array (now empty as drinks come from API)
   */
  test('should have DRINKS as an array', () => {
    expect(Array.isArray(DRINKS)).toBe(true);
  });

  /**
   * Test 2: Normal case - getDrinkById function exists
   * Verifies that getDrinkById is a function
   */
  test('should export getDrinkById function', () => {
    expect(typeof getDrinkById).toBe('function');
  });

  /**
   * Test 3: Edge case - Empty DRINKS array
   * Verifies that DRINKS is empty (drinks are now fetched from API)
   */
  test('should have empty DRINKS array (drinks come from API)', () => {
    expect(DRINKS.length).toBe(0);
  });

  /**
   * Test 4: Edge case - getDrinkById with empty array
   * Verifies that getDrinkById returns undefined when DRINKS is empty
   */
  test('should return undefined when DRINKS is empty', () => {
    const drink = getDrinkById('1');
    expect(drink).toBeUndefined();
  });

  /**
   * Test 5: Type check - Drink interface
   * Verifies that Drink type has required fields
   */
  test('should have correct Drink type structure', () => {
    const sampleDrink: Drink = {
      id: 'test-1',
      name: 'Test Drink',
      category: 'Cocktail',
      ingredients: ['ingredient1', 'ingredient2'],
      instructions: 'Mix well',
      difficulty: 'Easy',
      prepTime: '5 min',
    };
    expect(sampleDrink.id).toBe('test-1');
    expect(sampleDrink.name).toBe('Test Drink');
    expect(sampleDrink.difficulty).toBe('Easy');
  });
});
