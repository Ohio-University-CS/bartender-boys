import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FavoritesState = {
  ids: string[];
  isFavorite: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggleFavorite: (id: string) => void;
  clear: () => void;
};

const FavoritesContext = createContext<FavoritesState | undefined>(undefined);
const KEY = 'favorites.ids';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setIds(parsed.filter((x) => typeof x === 'string'));
        }
      } catch {}
    })();
  }, []);

  // Persist
  useEffect(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(ids)).catch(() => {});
  }, [ids]);

  const value = useMemo<FavoritesState>(() => ({
    ids,
    isFavorite: (id: string) => ids.includes(id),
    add: (id: string) => setIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
    remove: (id: string) => setIds((prev) => prev.filter((x) => x !== id)),
    toggleFavorite: (id: string) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    clear: () => setIds([]),
  }), [ids]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
