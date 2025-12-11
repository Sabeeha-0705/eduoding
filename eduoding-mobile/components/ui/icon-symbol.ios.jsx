// components/ui/icon-symbol.jsx
import { SymbolView } from 'expo-symbols';

/**
 * IconSymbol - small wrapper around expo-symbols' SymbolView
 *
 * Props:
 *  - name (string)           : symbol name (required)
 *  - size (number)           : width & height in px (default 24)
 *  - color (string)          : tintColor for the symbol
 *  - style (object|array)    : additional style
 *  - weight ('regular'|...)  : symbol weight (default 'regular')
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}) {
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
