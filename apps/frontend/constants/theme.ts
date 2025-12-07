/**
 * Below are the colors that are used in the app. The colors are defined in HSL format for better web performance and easier manipulation.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

/**
 * Converts HSL values to a color string that works across all platforms
 * For web: returns hsl() format
 * For native: converts to hex
 */
function hsl(h: number, s: number, l: number, a?: number): string {
  if (Platform.OS === 'web') {
    return a !== undefined ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`;
  }
  // For native platforms, convert HSL to hex
  return hslToHex(h, s, l, a);
}

/**
 * Converts HSL to hex for native platforms
 */
function hslToHex(h: number, s: number, l: number, a?: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  if (a !== undefined) {
    const alpha = Math.round(a * 255).toString(16).padStart(2, '0');
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${alpha}`;
  }
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const BASE_COLORS = {
  light: {
    text: hsl(210, 20, 9),
    background: hsl(0, 0, 100),
    surface: hsl(0, 0, 96),
    surfaceAlt: hsl(0, 0, 94),
    surfaceElevated: hsl(0, 0, 100),
    border: hsl(0, 0, 90),
    muted: hsl(215, 16, 47),
    mutedForeground: hsl(215, 12, 52),
    placeholder: hsl(214, 12, 64),
    tint: hsl(39, 100, 50),
    onTint: hsl(0, 0, 12),
    icon: hsl(210, 9, 45),
    tabIconDefault: hsl(210, 9, 45),
    tabIconSelected: hsl(39, 100, 50),
    chipBackground: hsl(0, 0, 93),
    chipBorder: hsl(0, 0, 84),
    inputBackground: hsl(0, 0, 100),
    inputBorder: hsl(214, 32, 91),
    danger: hsl(0, 72, 51),
    onDanger: hsl(0, 0, 100),
    success: hsl(142, 71, 45),
    onSuccess: hsl(0, 0, 100),
    warning: hsl(38, 92, 50),
    onWarning: hsl(215, 28, 17),
    hoverOverlay: hsl(0, 0, 0, 0.04),
    focusRing: hsl(39, 100, 50, 0.3),
  },
  dark: {
    text: hsl(210, 5, 93),
    background: hsl(0, 0, 5),
    surface: hsl(0, 0, 7),
    surfaceAlt: hsl(0, 0, 9),
    surfaceElevated: hsl(0, 0, 12),
    border: hsl(0, 0, 16),
    muted: hsl(210, 6, 65),
    mutedForeground: hsl(210, 5, 70),
    placeholder: hsl(0, 0, 40),
    tint: hsl(39, 100, 50),
    onTint: hsl(0, 0, 8),
    icon: hsl(210, 6, 65),
    tabIconDefault: hsl(0, 0, 48),
    tabIconSelected: hsl(39, 100, 50),
    chipBackground: hsl(0, 0, 11),
    chipBorder: hsl(0, 0, 18),
    inputBackground: hsl(0, 0, 8),
    inputBorder: hsl(0, 0, 18),
    danger: hsl(0, 65, 66),
    onDanger: hsl(0, 0, 10),
    success: hsl(173, 80, 40),
    onSuccess: hsl(173, 100, 4),
    warning: hsl(45, 93, 47),
    onWarning: hsl(0, 0, 7),
    hoverOverlay: hsl(0, 0, 100, 0.05),
    focusRing: hsl(39, 100, 50, 0.4),
  },
} as const;

const ACCENT_PRESETS = {
  sunset: {
    label: 'Sunset Citrus',
    preview: hsl(39, 100, 50),
    light: {
      tint: hsl(39, 100, 50),
      onTint: hsl(0, 0, 12),
      tabIconSelected: hsl(39, 100, 50),
    },
    dark: {
      tint: hsl(39, 100, 60),
      onTint: hsl(0, 0, 8),
      tabIconSelected: hsl(39, 100, 60),
    },
  },
  ocean: {
    label: 'Ocean Breeze',
    preview: hsl(199, 89, 48),
    light: {
      tint: hsl(199, 89, 48),
      onTint: hsl(199, 95, 12),
      tabIconSelected: hsl(199, 89, 48),
    },
    dark: {
      tint: hsl(199, 96, 66),
      onTint: hsl(199, 95, 6),
      tabIconSelected: hsl(199, 96, 66),
    },
  },
  orchid: {
    label: 'Orchid Bloom',
    preview: hsl(271, 91, 65),
    light: {
      tint: hsl(271, 91, 65),
      onTint: hsl(271, 85, 15),
      tabIconSelected: hsl(271, 91, 65),
    },
    dark: {
      tint: hsl(271, 83, 75),
      onTint: hsl(271, 85, 8),
      tabIconSelected: hsl(271, 83, 75),
    },
  },
  forest: {
    label: 'Forest Dew',
    preview: hsl(142, 71, 45),
    light: {
      tint: hsl(142, 71, 45),
      onTint: hsl(142, 85, 8),
      tabIconSelected: hsl(142, 71, 45),
    },
    dark: {
      tint: hsl(142, 70, 60),
      onTint: hsl(142, 85, 4),
      tabIconSelected: hsl(142, 70, 60),
    },
  },
} as const;

export type AccentOption = keyof typeof ACCENT_PRESETS;

export const DEFAULT_ACCENT: AccentOption = 'sunset';

export const ACCENT_OPTIONS = (Object.entries(ACCENT_PRESETS) as [
  AccentOption,
  (typeof ACCENT_PRESETS)[AccentOption]
][]).map(([key, value]) => ({
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

/**
 * Centralized font configuration - change fonts here for the entire app
 * 
 * To change the app font globally:
 * 1. Update FONT_REGULAR and FONT_BOLD to your font names
 * 2. Make sure the font files are loaded in app/_layout.tsx
 * 3. All components will automatically use the new fonts
 */
const FONT_REGULAR = 'Montserrat-Regular';
const FONT_BOLD = 'Montserrat-Bold';
const FONT_WEB_FALLBACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Platform-specific font families
export const FontFamilies = {
  regular: Platform.select({
    ios: FONT_REGULAR,
    android: FONT_REGULAR,
    web: `'${FONT_REGULAR}', ${FONT_WEB_FALLBACK}`,
  }),
  bold: Platform.select({
    ios: FONT_BOLD,
    android: FONT_BOLD,
    web: `'${FONT_BOLD}', ${FONT_WEB_FALLBACK}`,
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    web: "'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace",
  }),
};

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
    serif: "Georgia, 'Merriweather', 'Lora', 'Crimson Text', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
