import { View, type ViewProps } from 'react-native';

import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

type ThemeColorName = keyof typeof Colors.light;

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  colorName?: ThemeColorName;
};

export function ThemedView({ style, lightColor, darkColor, colorName = 'background', ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, colorName);

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
