// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type TextStyle, Platform } from 'react-native';
let Text: React.ComponentType<any>;
if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Text = require('react-native-web').Text;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Text = require('react-native').Text;
}

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
  // Added mappings used by tabs
  'list.bullet.rectangle': '🍸',
  'bubble.left.and.bubble.right': '💬',
  'gear': '⚙️',
  'heart.fill': '❤️',
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
  // Render emoji for mapped tab icons
  // Only render emoji for focused tab (large icon), otherwise render nothing for inactive tab icon
  if (['🍸','❤️','💬','⚙️'].includes(MAPPING[name])) {
    // If size > 24, assume focused/active tab, render emoji
    if (size > 24) {
      // @ts-ignore: color prop for Text
      return <Text style={[{ fontSize: size, color }, style]}>{MAPPING[name]}</Text>;
    }
    // Otherwise, render nothing for inactive tab icon
    return null;
  }
  // Fallback to MaterialIcons for other icons
  return <MaterialIcons color={color} size={size} name={MAPPING[name] as any} style={style} />;
}
