import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { useSettings } from '@/contexts/settings';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { hapticsEnabled, hapticStrength } = useSettings();
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios' && hapticsEnabled) {
          // Add a configurable haptic feedback when pressing down on the tabs.
          const style =
            hapticStrength === 'heavy'
              ? Haptics.ImpactFeedbackStyle.Heavy
              : hapticStrength === 'medium'
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light;
          Haptics.impactAsync(style);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
