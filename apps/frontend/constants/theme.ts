/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Orange accent similar to screenshot
const orange = '#FFA500';
const tintColorLight = orange;
const tintColorDark = orange;

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
    tint: tintColorLight,
    onTint: '#1F1F1F',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
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
    tint: tintColorDark,
    onTint: '#141414',
    icon: '#9BA1A6',
    tabIconDefault: '#7A7A7A',
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
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
