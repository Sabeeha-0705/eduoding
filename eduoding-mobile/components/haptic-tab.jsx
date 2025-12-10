import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

/**
 * A PlatformPressable that adds a soft haptic feedback when pressed on iOS.
 * Useful for BottomTabBar buttons.
 */
export function HapticTab(props) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          // Soft haptic feedback when pressing down on tabs
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
