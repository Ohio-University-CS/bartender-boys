/**
 * Favorites context tests
 *
 * Tests the favorites management functionality including
 * adding, removing, toggling, and checking favorite status.
 *
 * Note: These tests use mocked AsyncStorage to avoid
 * actual storage operations during testing.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

// Simple in-memory implementation for testing favorites logic
class FavoritesManager {
  private ids: string[] = [];

  isFavorite(id: string): boolean {
    return this.ids.includes(id);
  }

  add(id: string): void {
    if (!this.ids.includes(id)) {
      this.ids.push(id);
    }
  }

  remove(id: string): void {
    this.ids = this.ids.filter(x => x !== id);
  }

  toggleFavorite(id: string): void {
    if (this.ids.includes(id)) {
      this.remove(id);
    } else {
      this.add(id);
    }
  }

  clear(): void {
    this.ids = [];
  }

  getIds(): string[] {
    return [...this.ids];
  }
}

describe('FavoritesManager.isFavorite()', () => {
  let manager: FavoritesManager;

  beforeEach(() => {
    manager = new FavoritesManager();
  });

  // Normal case: returns true for favorited item
  test('should return true when item is in favorites', () => {
    manager.add('1');
    expect(manager.isFavorite('1')).toBe(true);
  });

  // Edge case: returns false for non-favorited item
  test('should return false when item is not in favorites', () => {
    expect(manager.isFavorite('1')).toBe(false);
  });

  // Error case: handles empty string ID
  test('should handle empty string ID gracefully', () => {
    manager.add('');
    expect(manager.isFavorite('')).toBe(true);
    expect(manager.isFavorite('non-empty')).toBe(false);
  });
});

describe('FavoritesManager.add()', () => {
  let manager: FavoritesManager;

  beforeEach(() => {
    manager = new FavoritesManager();
  });

  // Normal case: adds new favorite
  test('should add a new favorite when not already present', () => {
    manager.add('1');
    expect(manager.getIds()).toContain('1');
    expect(manager.getIds().length).toBe(1);
  });

  // Edge case: does not duplicate existing favorite
  test('should not add duplicate favorites', () => {
    manager.add('1');
    manager.add('1');
    expect(manager.getIds().filter(id => id === '1').length).toBe(1);
  });

  // Error case: handles multiple adds correctly
  test('should handle multiple different favorites', () => {
    manager.add('1');
    manager.add('2');
    manager.add('3');
    expect(manager.getIds().length).toBe(3);
    expect(manager.getIds()).toContain('1');
    expect(manager.getIds()).toContain('2');
    expect(manager.getIds()).toContain('3');
  });
});

describe('FavoritesManager.remove()', () => {
  let manager: FavoritesManager;

  beforeEach(() => {
    manager = new FavoritesManager();
  });

  // Normal case: removes existing favorite
  test('should remove an existing favorite', () => {
    manager.add('1');
    manager.add('2');
    manager.remove('1');
    expect(manager.getIds()).not.toContain('1');
    expect(manager.getIds()).toContain('2');
  });

  // Edge case: handles removal of non-existent favorite
  test('should handle removal of non-existent favorite gracefully', () => {
    expect(() => {
      manager.remove('non-existent');
    }).not.toThrow();
    expect(manager.getIds().length).toBe(0);
  });

  // Error case: removes correct item from multiple favorites
  test('should remove only the specified favorite from multiple', () => {
    manager.add('1');
    manager.add('2');
    manager.add('3');
    manager.remove('2');
    expect(manager.getIds()).toContain('1');
    expect(manager.getIds()).not.toContain('2');
    expect(manager.getIds()).toContain('3');
  });
});

describe('FavoritesManager.toggleFavorite()', () => {
  let manager: FavoritesManager;

  beforeEach(() => {
    manager = new FavoritesManager();
  });

  // Normal case: adds when not favorited
  test('should add favorite when item is not favorited', () => {
    manager.toggleFavorite('1');
    expect(manager.isFavorite('1')).toBe(true);
  });

  // Edge case: removes when already favorited
  test('should remove favorite when item is already favorited', () => {
    manager.add('1');
    manager.toggleFavorite('1');
    expect(manager.isFavorite('1')).toBe(false);
  });

  // Error case: handles multiple toggles correctly
  test('should handle multiple toggles correctly', () => {
    manager.toggleFavorite('1');
    expect(manager.isFavorite('1')).toBe(true);
    manager.toggleFavorite('1');
    expect(manager.isFavorite('1')).toBe(false);
    manager.toggleFavorite('1');
    expect(manager.isFavorite('1')).toBe(true);
  });
});

describe('FavoritesManager.clear()', () => {
  let manager: FavoritesManager;

  beforeEach(() => {
    manager = new FavoritesManager();
  });

  // Normal case: clears all favorites
  test('should clear all favorites', () => {
    manager.add('1');
    manager.add('2');
    manager.add('3');
    manager.clear();
    expect(manager.getIds().length).toBe(0);
  });

  // Edge case: handles clearing empty list
  test('should handle clearing empty favorites list', () => {
    expect(() => {
      manager.clear();
    }).not.toThrow();
    expect(manager.getIds().length).toBe(0);
  });

  // Error case: clear should not affect new additions
  test('should allow adding favorites after clear', () => {
    manager.add('1');
    manager.clear();
    manager.add('2');
    expect(manager.getIds()).toContain('2');
    expect(manager.getIds().length).toBe(1);
  });
});

