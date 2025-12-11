// components/ui/icon-symbol.jsx
// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';
import { OpaqueColorValue } from 'react-native';

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the Icons Directory: https://icons.expo.fyi
 * - see SF Symbols in the SF Symbols app from Apple.
 *
 * Keys are SF Symbol names (used in the app). Values are MaterialIcons names.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  // add more mappings if needed
};

/**
 * IconSymbol - uses MaterialIcons (Android/web). On iOS the project may instead
 * use expo-symbols' SymbolView; this file is the cross-platform fallback.
 *
 * Props:
 *  - name: string (SF Symbol name used by the app)
 *  - size?: number
 *  - color?: string | OpaqueColorValue
 *  - style?: any
 *  - weight?: (ignored by MaterialIcons fallback)
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight, // accepted but ignored in this fallback
}) {
  const mapped = MAPPING[name] ?? 'help-outline';
  return <MaterialIcons color={color} size={size} name={mapped} style={style} />;
}

export default IconSymbol;
