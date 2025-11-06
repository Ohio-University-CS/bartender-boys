/**
 * Drinks utilities tests
 *
 * This file validates the data access helper `getDrinkById` against the
 * in-memory `DRINKS` catalog used by the app.
 *
 * Coverage:
 * - Successful lookup by valid id
 * - Graceful handling when id is not found
 * - Edge cases with different id formats
 */
import { describe, test, expect } from 'vitest';
import { DRINKS, getDrinkById, type Drink } from '@/constants/drinks';

describe('getDrinkById()', () => {
  // Normal case: returns correct drink object for valid ID
  test('should return the correct drink object when given a valid drink ID', () => {
    const drink = getDrinkById('1');
    expect(drink).toBeDefined();
    expect(drink?.name).toBe('Classic Margarita');
    expect(drink?.category).toBe('Cocktail');
    expect(drink?.ingredients).toBeInstanceOf(Array);
  });

  // Edge case: returns undefined for non-existent ID
  test('should return undefined when given a drink ID that does not exist', () => {
    const drink = getDrinkById('does-not-exist');
    expect(drink).toBeUndefined();
  });

  // Error case: handles empty string and null-like values
  test('should return undefined for empty string or invalid ID formats', () => {
    expect(getDrinkById('')).toBeUndefined();
    expect(getDrinkById('999999')).toBeUndefined();
    expect(getDrinkById('null')).toBeUndefined();
  });
});

describe('DRINKS array validation', () => {
  // Normal case: array contains expected structure
  test('should contain drinks with required properties', () => {
    expect(DRINKS.length).toBeGreaterThan(0);
    const firstDrink = DRINKS[0];
    expect(firstDrink).toHaveProperty('id');
    expect(firstDrink).toHaveProperty('name');
    expect(firstDrink).toHaveProperty('category');
    expect(firstDrink).toHaveProperty('ingredients');
  });

  // Edge case: all drinks have unique IDs
  test('should have unique IDs for all drinks', () => {
    const ids = DRINKS.map(d => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // Error case: no drinks should have empty required fields
  test('should not have drinks with empty required fields', () => {
    DRINKS.forEach(drink => {
      expect(drink.id).toBeTruthy();
      expect(drink.name).toBeTruthy();
      expect(drink.category).toBeTruthy();
    });
  });
});

describe('Drink object structure', () => {
  // Normal case: drink has correct type structure
  test('should have correct Drink type structure', () => {
    const drink = getDrinkById('1');
    expect(drink).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      category: expect.any(String),
      ingredients: expect.any(Array),
      instructions: expect.any(String),
      difficulty: expect.stringMatching(/Easy|Medium|Hard/),
      prepTime: expect.any(String),
    });
  });

  // Edge case: optional hardwareSteps property
  test('should handle drinks with and without hardwareSteps', () => {
    const withHardware = getDrinkById('1');
    const withoutHardware = getDrinkById('4');
    expect(withHardware?.hardwareSteps).toBeDefined();
    expect(withoutHardware?.hardwareSteps).toBeUndefined();
  });

  // Error case: ingredients should always be an array
  test('should always have ingredients as an array', () => {
    DRINKS.forEach(drink => {
      expect(Array.isArray(drink.ingredients)).toBe(true);
      expect(drink.ingredients.length).toBeGreaterThan(0);
    });
  });
});
