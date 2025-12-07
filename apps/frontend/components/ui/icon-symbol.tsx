// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconSymbolName = string;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING: { [key: string]: string } = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  // Tab navigation icons
  'list.bullet.rectangle': 'restaurant-menu',
  'wineglass.fill': 'local-bar',
  'bubble.left.and.bubble.right': 'chat',
  'person.fill': 'person',
  'gear': 'settings',
  'heart.fill': 'favorite',
};

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // Use MaterialIcons for all icons (including tab icons)
  const iconName = MAPPING[name];
  if (!iconName) {
    console.warn(`Icon "${name}" not found in mapping`);
    return null;
  }
  return <MaterialIcons color={color} size={size} name={iconName as any} style={style} />;
}
