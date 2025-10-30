/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useMemo } from 'react';

import { Colors, createThemeColors } from '@/constants/theme';
import { useSettings } from '@/contexts/settings';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const { accentColor } = useSettings();
  const palette = useMemo(() => createThemeColors(accentColor), [accentColor]);
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return palette[theme][colorName] ?? Colors[theme][colorName];
  }
}
