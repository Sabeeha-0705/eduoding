// hooks/use-theme-color.js
import { useColorScheme } from './use-color-scheme';
import { Colors } from '../constants/theme';

/**
 * useThemeColor(props = {}, colorName)
 * - props: optional override object, can be { light: '#fff', dark: '#000' } OR { light: '#fff' } etc.
 * - colorName: key from your Colors theme (e.g. 'background', 'text', 'icon')
 *
 * Returns the appropriate color string for the current color scheme.
 */
export function useThemeColor(props = {}, colorName) {
  const scheme = useColorScheme() ?? 'light';

  // If caller passed per-scheme override (props.light / props.dark), prefer that
  if (props && props[scheme]) {
    return props[scheme];
  }

  // Fallback to Colors constant
  const themeColors = Colors[scheme] || Colors.light;
  return (themeColors && themeColors[colorName]) || null;
}

// Optional default export for files that used default import style
export default useThemeColor;
