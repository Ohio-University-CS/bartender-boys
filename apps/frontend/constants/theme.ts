/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceAlt: '#EFEFEF',
    surfaceElevated: '#FFFFFF',
    border: '#E5E5E5',
    muted: '#6B7280',
    mutedForeground: '#7C818F',
    placeholder: '#9CA3AF',
    tint: '#FFA500',
    onTint: '#1F1F1F',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#FFA500',
    chipBackground: '#ECECEC',
    chipBorder: '#D7D7D7',
    inputBackground: '#FFFFFF',
    inputBorder: '#CBD5E1',
    danger: '#D92D20',
    onDanger: '#FFFFFF',
    success: '#16A34A',
    onSuccess: '#FFFFFF',
    warning: '#F59E0B',
    onWarning: '#1F2937',
  },
  dark: {
    text: '#ECEDEE',
    background: '#0C0C0C',
    surface: '#111111',
    surfaceAlt: '#181818',
    surfaceElevated: '#1F1F1F',
    border: '#2A2A2A',
    muted: '#9BA1A6',
    mutedForeground: '#A7ADB2',
    placeholder: '#666666',
    tint: '#FFA500',
    onTint: '#141414',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    chipBackground: '#1C1C1C',
    chipBorder: '#2E2E2E',
    inputBackground: '#141414',
    inputBorder: '#2E2E2E',
    danger: '#F97066',
    onDanger: '#1A1A1A',
    success: '#2DD4BF',
    onSuccess: '#001514',
    warning: '#FBBF24',
    onWarning: '#111111',
  },
} as const;

const ACCENT_PRESETS = {
  sunset: {
    label: 'Sunset Citrus',
    preview: '#FFA500',
    light: {
      tint: '#FFA500',
      onTint: '#1F1F1F',
      tabIconSelected: '#FFA500',
    },
    dark: {
      tint: '#FFB347',
      onTint: '#141414',
      tabIconSelected: '#FFB347',
    },
  },
  ocean: {
    label: 'Ocean Breeze',
    preview: '#0EA5E9',
    light: {
      tint: '#0EA5E9',
      onTint: '#02233A',
      tabIconSelected: '#0EA5E9',
    },
    dark: {
      tint: '#38BDF8',
      onTint: '#01121E',
      tabIconSelected: '#38BDF8',
    },
  },
  orchid: {
    label: 'Orchid Bloom',
    preview: '#A855F7',
    light: {
      tint: '#A855F7',
      onTint: '#23093C',
      tabIconSelected: '#A855F7',
    },
    dark: {
      tint: '#C084FC',
      onTint: '#150725',
      tabIconSelected: '#C084FC',
    },
  },
  forest: {
    label: 'Forest Dew',
    preview: '#22C55E',
    light: {
      tint: '#22C55E',
      onTint: '#062412',
      tabIconSelected: '#22C55E',
    },
    dark: {
      tint: '#4ADE80',
      onTint: '#021508',
      tabIconSelected: '#4ADE80',
    },
  },
} as const;

export type AccentOption = keyof typeof ACCENT_PRESETS;

export const DEFAULT_ACCENT: AccentOption = 'sunset';

export const ACCENT_OPTIONS = (Object.entries(ACCENT_PRESETS) as Array<[
  AccentOption,
  (typeof ACCENT_PRESETS)[AccentOption]
]>).map(([key, value]) => ({
  key,
  label: value.label,
  preview: value.preview,
}));

export const Colors = createThemeColors(DEFAULT_ACCENT);

export function createThemeColors(accent: AccentOption) {
  const preset = ACCENT_PRESETS[accent];
  return {
    light: { ...BASE_COLORS.light, ...preset.light },
    dark: { ...BASE_COLORS.dark, ...preset.dark },
  };
}

export function resolveColorValue<T extends keyof typeof BASE_COLORS.light>(
  mode: 'light' | 'dark',
  accent: AccentOption,
  token: T
) {
  return createThemeColors(accent)[mode][token];
}

export function isAccentOption(value: string): value is AccentOption {
  return value in ACCENT_PRESETS;
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
