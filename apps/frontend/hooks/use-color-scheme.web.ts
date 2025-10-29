import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettings } from '@/contexts/settings';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): 'light' | 'dark' | null {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();
  const { theme } = useSettings();

  if (hasHydrated) {
    if (theme === 'system') return (colorScheme ?? null);
    return theme;
  }

  // Pre-hydration fallback
  if (theme === 'system') return 'light';
  return theme;
}
