import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_PROD } from '@/environment';
import { logger } from '@/utils/logger';

type ThemePref = 'system' | 'light' | 'dark';

type SettingsState = {
  theme: ThemePref;
  apiBaseUrl: string; // optional override for runtime
  hapticsEnabled: boolean;
  debugLogs: boolean;
  idPhotoWidth: number; // e.g. 720/900/1200
  scanTimeoutMs: number; // axios timeout for ID scan
  setTheme: (t: ThemePref) => void;
  setApiBaseUrl: (url: string) => void;
  setHapticsEnabled: (v: boolean) => void;
  setDebugLogs: (v: boolean) => void;
  setIdPhotoWidth: (n: number) => void;
  setScanTimeoutMs: (n: number) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsState | undefined>(undefined);

const THEME_KEY = 'settings.theme';
const API_KEY = 'settings.apiBaseUrl';
const HAPTICS_KEY = 'settings.hapticsEnabled';
const LOGS_KEY = 'settings.debugLogs';
const PHOTO_WIDTH_KEY = 'settings.idPhotoWidth';
const TIMEOUT_KEY = 'settings.scanTimeoutMs';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>('dark');
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>('');
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(true);
  const [debugLogs, setDebugLogsState] = useState<boolean>(!IS_PROD);
  const [idPhotoWidth, setIdPhotoWidthState] = useState<number>(900);
  const [scanTimeoutMs, setScanTimeoutMsState] = useState<number>(60000);

  // load on mount
  useEffect(() => {
    (async () => {
      try {
        const [t, url, h, d, w, to] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(API_KEY),
          AsyncStorage.getItem(HAPTICS_KEY),
          AsyncStorage.getItem(LOGS_KEY),
          AsyncStorage.getItem(PHOTO_WIDTH_KEY),
          AsyncStorage.getItem(TIMEOUT_KEY),
        ]);
        if (t === 'light' || t === 'dark' || t === 'system') setThemeState(t);
        if (url) setApiBaseUrlState(url);
        if (h === 'true' || h === 'false') setHapticsEnabledState(h === 'true');
        if (d === 'true' || d === 'false') setDebugLogsState(d === 'true');
        if (w && !Number.isNaN(Number(w))) setIdPhotoWidthState(Number(w));
        if (to && !Number.isNaN(Number(to))) setScanTimeoutMsState(Number(to));
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
  useEffect(() => {
    AsyncStorage.setItem(HAPTICS_KEY, String(hapticsEnabled)).catch(() => {});
  }, [hapticsEnabled]);
  useEffect(() => {
    AsyncStorage.setItem(LOGS_KEY, String(debugLogs)).catch(() => {});
    // Propagate to logger at runtime (don't allow logs in prod regardless)
    logger.setEnabled(!IS_PROD && debugLogs);
  }, [debugLogs]);
  useEffect(() => {
    AsyncStorage.setItem(PHOTO_WIDTH_KEY, String(idPhotoWidth)).catch(() => {});
  }, [idPhotoWidth]);
  useEffect(() => {
    AsyncStorage.setItem(TIMEOUT_KEY, String(scanTimeoutMs)).catch(() => {});
  }, [scanTimeoutMs]);

  const value = useMemo<SettingsState>(() => ({
    theme,
    apiBaseUrl,
    hapticsEnabled,
    debugLogs,
    idPhotoWidth,
    scanTimeoutMs,
    setTheme: setThemeState,
    setApiBaseUrl: setApiBaseUrlState,
    setHapticsEnabled: setHapticsEnabledState,
    setDebugLogs: setDebugLogsState,
    setIdPhotoWidth: setIdPhotoWidthState,
    setScanTimeoutMs: setScanTimeoutMsState,
    reset: () => {
      setThemeState('dark');
      setApiBaseUrlState('');
      setHapticsEnabledState(true);
      setDebugLogsState(!IS_PROD);
      setIdPhotoWidthState(900);
      setScanTimeoutMsState(60000);
      AsyncStorage.multiRemove([
        THEME_KEY,
        API_KEY,
        HAPTICS_KEY,
        LOGS_KEY,
        PHOTO_WIDTH_KEY,
        TIMEOUT_KEY,
      ]).catch(() => {});
      // Ensure logger follows reset
      logger.setEnabled(!IS_PROD && (!IS_PROD));
    },
  }), [theme, apiBaseUrl, hapticsEnabled, debugLogs, idPhotoWidth, scanTimeoutMs]);

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
