import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, FontFamilies } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

type ThemeColorName = keyof typeof Colors.light;

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
  colorName?: ThemeColorName;
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  colorName = 'text',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, colorName);
  const tintColor = useThemeColor({}, 'tint');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
  type === 'defaultSemiBold' ? styles.default : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? [styles.link, { color: tintColor }] : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FontFamilies.regular,
  },
  title: {
    fontSize: 32,
    fontFamily: FontFamilies.bold,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: FontFamilies.bold,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    fontFamily: FontFamilies.bold,
  },
  // ...existing code...
});
