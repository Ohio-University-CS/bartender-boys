import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_PROD } from '@/environment';
import { logger } from '@/utils/logger';

type ThemePref = 'system' | 'light' | 'dark';

type HapticStrength = 'light' | 'medium' | 'heavy';

type SettingsState = {
  theme: ThemePref;
  apiBaseUrl: string; // optional override for runtime
  hapticsEnabled: boolean;
  hapticStrength: HapticStrength;
  debugLogs: boolean;
  idPhotoWidth: number; // e.g. 720/900/1200
  scanTimeoutMs: number; // axios timeout for ID scan
  displayName: string; // user-friendly name
  profilePronouns: string;
  favoriteSpirit: string;
  homeBarName: string;
  bartenderBio: string;
  setTheme: (t: ThemePref) => void;
  setApiBaseUrl: (url: string) => void;
  setHapticsEnabled: (v: boolean) => void;
  setHapticStrength: (v: HapticStrength) => void;
  setDebugLogs: (v: boolean) => void;
  setIdPhotoWidth: (n: number) => void;
  setScanTimeoutMs: (n: number) => void;
  setDisplayName: (name: string) => void;
  setProfilePronouns: (value: string) => void;
  setFavoriteSpirit: (value: string) => void;
  setHomeBarName: (value: string) => void;
  setBartenderBio: (value: string) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsState | undefined>(undefined);

const THEME_KEY = 'settings.theme';
const API_KEY = 'settings.apiBaseUrl';
const HAPTICS_KEY = 'settings.hapticsEnabled';
const HAPTIC_STRENGTH_KEY = 'settings.hapticStrength';
const LOGS_KEY = 'settings.debugLogs';
const PHOTO_WIDTH_KEY = 'settings.idPhotoWidth';
const TIMEOUT_KEY = 'settings.scanTimeoutMs';
const DISPLAY_NAME_KEY = 'settings.displayName';
const PROFILE_PRONOUNS_KEY = 'settings.profilePronouns';
const FAVORITE_SPIRIT_KEY = 'settings.favoriteSpirit';
const HOME_BAR_NAME_KEY = 'settings.homeBarName';
const BARTENDER_BIO_KEY = 'settings.bartenderBio';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>('dark');
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>('');
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(true);
  const [hapticStrength, setHapticStrengthState] = useState<HapticStrength>('light');
  const [debugLogs, setDebugLogsState] = useState<boolean>(!IS_PROD);
  const [idPhotoWidth, setIdPhotoWidthState] = useState<number>(900);
  const [scanTimeoutMs, setScanTimeoutMsState] = useState<number>(60000);
  const [displayName, setDisplayNameState] = useState<string>('');
  const [profilePronouns, setProfilePronounsState] = useState<string>('');
  const [favoriteSpirit, setFavoriteSpiritState] = useState<string>('');
  const [homeBarName, setHomeBarNameState] = useState<string>('');
  const [bartenderBio, setBartenderBioState] = useState<string>('');

  // load on mount
  useEffect(() => {
    (async () => {
      try {
        const [t, url, h, hs, d, w, to, dn, pronouns, spirit, homeBar, bio] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(API_KEY),
          AsyncStorage.getItem(HAPTICS_KEY),
          AsyncStorage.getItem(HAPTIC_STRENGTH_KEY),
          AsyncStorage.getItem(LOGS_KEY),
          AsyncStorage.getItem(PHOTO_WIDTH_KEY),
          AsyncStorage.getItem(TIMEOUT_KEY),
          AsyncStorage.getItem(DISPLAY_NAME_KEY),
          AsyncStorage.getItem(PROFILE_PRONOUNS_KEY),
          AsyncStorage.getItem(FAVORITE_SPIRIT_KEY),
          AsyncStorage.getItem(HOME_BAR_NAME_KEY),
          AsyncStorage.getItem(BARTENDER_BIO_KEY),
        ]);
        if (t === 'light' || t === 'dark' || t === 'system') setThemeState(t);
        if (url) setApiBaseUrlState(url);
        if (h === 'true' || h === 'false') setHapticsEnabledState(h === 'true');
        if (hs === 'light' || hs === 'medium' || hs === 'heavy') setHapticStrengthState(hs);
        if (d === 'true' || d === 'false') setDebugLogsState(d === 'true');
        if (w && !Number.isNaN(Number(w))) setIdPhotoWidthState(Number(w));
        if (to && !Number.isNaN(Number(to))) setScanTimeoutMsState(Number(to));
        if (typeof dn === 'string') setDisplayNameState(dn);
        if (typeof pronouns === 'string') setProfilePronounsState(pronouns);
        if (typeof spirit === 'string') setFavoriteSpiritState(spirit);
        if (typeof homeBar === 'string') setHomeBarNameState(homeBar);
        if (typeof bio === 'string') setBartenderBioState(bio);
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
    AsyncStorage.setItem(HAPTIC_STRENGTH_KEY, String(hapticStrength)).catch(() => {});
  }, [hapticStrength]);
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
  useEffect(() => {
    if (displayName) AsyncStorage.setItem(DISPLAY_NAME_KEY, displayName).catch(() => {});
    else AsyncStorage.removeItem(DISPLAY_NAME_KEY).catch(() => {});
  }, [displayName]);
  useEffect(() => {
    if (profilePronouns) AsyncStorage.setItem(PROFILE_PRONOUNS_KEY, profilePronouns).catch(() => {});
    else AsyncStorage.removeItem(PROFILE_PRONOUNS_KEY).catch(() => {});
  }, [profilePronouns]);
  useEffect(() => {
    if (favoriteSpirit) AsyncStorage.setItem(FAVORITE_SPIRIT_KEY, favoriteSpirit).catch(() => {});
    else AsyncStorage.removeItem(FAVORITE_SPIRIT_KEY).catch(() => {});
  }, [favoriteSpirit]);
  useEffect(() => {
    if (homeBarName) AsyncStorage.setItem(HOME_BAR_NAME_KEY, homeBarName).catch(() => {});
    else AsyncStorage.removeItem(HOME_BAR_NAME_KEY).catch(() => {});
  }, [homeBarName]);
  useEffect(() => {
    if (bartenderBio) AsyncStorage.setItem(BARTENDER_BIO_KEY, bartenderBio).catch(() => {});
    else AsyncStorage.removeItem(BARTENDER_BIO_KEY).catch(() => {});
  }, [bartenderBio]);
  const value = useMemo<SettingsState>(() => ({
    theme,
    apiBaseUrl,
    hapticsEnabled,
    hapticStrength,
    debugLogs,
    idPhotoWidth,
    scanTimeoutMs,
    displayName,
    profilePronouns,
    favoriteSpirit,
    homeBarName,
    bartenderBio,
    setTheme: setThemeState,
    setApiBaseUrl: setApiBaseUrlState,
    setHapticsEnabled: setHapticsEnabledState,
    setHapticStrength: setHapticStrengthState,
    setDebugLogs: setDebugLogsState,
    setIdPhotoWidth: setIdPhotoWidthState,
    setScanTimeoutMs: setScanTimeoutMsState,
    setDisplayName: setDisplayNameState,
    setProfilePronouns: setProfilePronounsState,
    setFavoriteSpirit: setFavoriteSpiritState,
    setHomeBarName: setHomeBarNameState,
    setBartenderBio: setBartenderBioState,
    reset: () => {
      setThemeState('dark');
      setApiBaseUrlState('');
      setHapticsEnabledState(true);
      setHapticStrengthState('light');
      setDebugLogsState(!IS_PROD);
      setIdPhotoWidthState(900);
      setScanTimeoutMsState(60000);
      setDisplayNameState('');
      setProfilePronounsState('');
      setFavoriteSpiritState('');
      setHomeBarNameState('');
      setBartenderBioState('');
      AsyncStorage.multiRemove([
        THEME_KEY,
        API_KEY,
        HAPTICS_KEY,
        HAPTIC_STRENGTH_KEY,
        LOGS_KEY,
        PHOTO_WIDTH_KEY,
        TIMEOUT_KEY,
        DISPLAY_NAME_KEY,
        PROFILE_PRONOUNS_KEY,
        FAVORITE_SPIRIT_KEY,
        HOME_BAR_NAME_KEY,
        BARTENDER_BIO_KEY,
      ]).catch(() => {});
      // Ensure logger follows reset
      logger.setEnabled(!IS_PROD && (!IS_PROD));
    },
  }), [theme, apiBaseUrl, hapticsEnabled, hapticStrength, debugLogs, idPhotoWidth, scanTimeoutMs, displayName, profilePronouns, favoriteSpirit, homeBarName, bartenderBio]);

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
