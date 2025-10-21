import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemePref = 'system' | 'light' | 'dark';

type SettingsState = {
  theme: ThemePref;
  apiBaseUrl: string; // optional override for runtime
  setTheme: (t: ThemePref) => void;
  setApiBaseUrl: (url: string) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsState | undefined>(undefined);

const THEME_KEY = 'settings.theme';
const API_KEY = 'settings.apiBaseUrl';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>('system');
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>('');

  // load on mount
  useEffect(() => {
    (async () => {
      try {
        const [t, url] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(API_KEY),
        ]);
        if (t === 'light' || t === 'dark' || t === 'system') setThemeState(t);
        if (url) setApiBaseUrlState(url);
      } catch {}
    })();
  }, []);

  // persist changes
  useEffect(() => {
    AsyncStorage.setItem(THEME_KEY, theme).catch(() => {});
  }, [theme]);
  useEffect(() => {
    if (apiBaseUrl) AsyncStorage.setItem(API_KEY, apiBaseUrl).catch(() => {});
    else AsyncStorage.removeItem(API_KEY).catch(() => {});
  }, [apiBaseUrl]);

  const value = useMemo<SettingsState>(() => ({
    theme,
    apiBaseUrl,
    setTheme: setThemeState,
    setApiBaseUrl: setApiBaseUrlState,
    reset: () => {
      setThemeState('system');
      setApiBaseUrlState('');
      AsyncStorage.multiRemove([THEME_KEY, API_KEY]).catch(() => {});
    },
  }), [theme, apiBaseUrl]);

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
