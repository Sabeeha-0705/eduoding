// components/themed-view.jsx
import { View } from 'react-native';
import { useThemeColor } from '../hooks/use-theme-color';

/**
 * Props:
 *  - lightColor?: string
 *  - darkColor?: string
 *  - style?: any
 *
 * All other View props are forwarded.
 */
export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    'background'
  );

  return (
    <View
      style={[{ backgroundColor }, style]}
      {...otherProps}
    />
  );
}

export default ThemedView;
