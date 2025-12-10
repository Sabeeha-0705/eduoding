// hooks/use-theme-color.js
/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '../constants/theme';
import useColorScheme from './use-color-scheme';

export default function useThemeColor(props = {}, colorName) {
  const theme = useColorScheme(); // returns 'light' or 'dark'
  const colorFromProps = props[colorName];
  if (colorFromProps) return colorFromProps;

  // Colors is a JS object like: { light: {...}, dark: {...} }
  return Colors[theme][colorName];
}
