/**
 * Unit tests for Favorites context
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FavoritesProvider, useFavorites } from '@/contexts/favorites';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const TestComponent = ({ onFavorites }: { onFavorites: (favorites: ReturnType<typeof useFavorites>) => void }) => {
  const favorites = useFavorites();
  React.useEffect(() => {
    onFavorites(favorites);
  }, [favorites]);
  return null;
};

describe('Favorites Context', () => {
  let favoritesState: ReturnType<typeof useFavorites> | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    favoritesState = null;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  /**
   * Test 1: Normal case - Adding a favorite
   * Verifies that add() function adds an ID to favorites
   */
  test('should add item to favorites', async () => {
    render(
      <FavoritesProvider>
        <TestComponent onFavorites={(f) => { favoritesState = f; }} />
      </FavoritesProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      favoritesState?.add('drink-1');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(favoritesState?.ids).toContain('drink-1');
    expect(favoritesState?.isFavorite('drink-1')).toBe(true);
  });

  /**
   * Test 2: Normal case - Removing a favorite
   * Verifies that remove() function removes an ID from favorites
   */
  test('should remove item from favorites', async () => {
    render(
      <FavoritesProvider>
        <TestComponent onFavorites={(f) => { favoritesState = f; }} />
      </FavoritesProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      favoritesState?.add('drink-1');
      await new Promise(resolve => setTimeout(resolve, 10));
      favoritesState?.remove('drink-1');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(favoritesState?.ids).not.toContain('drink-1');
    expect(favoritesState?.isFavorite('drink-1')).toBe(false);
  });

  /**
   * Test 3: Edge case - Toggle favorite
   * Verifies that toggleFavorite() adds when not present and removes when present
   */
  test('should toggle favorite status', async () => {
    render(
      <FavoritesProvider>
        <TestComponent onFavorites={(f) => { favoritesState = f; }} />
      </FavoritesProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      favoritesState?.toggleFavorite('drink-1');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(favoritesState?.isFavorite('drink-1')).toBe(true);
    
    await act(async () => {
      favoritesState?.toggleFavorite('drink-1');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(favoritesState?.isFavorite('drink-1')).toBe(false);
  });

  /**
   * Test 4: Normal case - Clear all favorites
   * Verifies that clear() removes all favorites
   */
  test('should clear all favorites', async () => {
    render(
      <FavoritesProvider>
        <TestComponent onFavorites={(f) => { favoritesState = f; }} />
      </FavoritesProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      favoritesState?.add('drink-1');
      favoritesState?.add('drink-2');
      favoritesState?.add('drink-3');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(favoritesState?.ids.length).toBe(3);
    
    await act(async () => {
      favoritesState?.clear();
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(favoritesState?.ids.length).toBe(0);
    expect(favoritesState?.isFavorite('drink-1')).toBe(false);
    expect(favoritesState?.isFavorite('drink-2')).toBe(false);
    expect(favoritesState?.isFavorite('drink-3')).toBe(false);
  });
});
