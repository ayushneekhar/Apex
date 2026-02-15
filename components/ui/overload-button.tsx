import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';

import { AppText } from './app-text';

type OverloadButtonProps = {
  disabled?: boolean;
  onPress: () => void;
};

export function OverloadButton({ disabled = false, onPress }: OverloadButtonProps) {
  const theme = useAppTheme();
  const progress = useSharedValue(0);

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 0.35, 0.75, 1], [1, 0, 0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(progress.value, [0, 0.35, 0.75, 1], [0, 14, 14, 0], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 0.2, 0.5, 0.85, 1], [0, 1, 1, 0, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            progress.value,
            [0, 0.2, 0.5, 0.85, 1],
            [-14, 0, 10, 18, 18],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  const triggerAnimation = () => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 520,
      easing: Easing.out(Easing.quad),
    });
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        triggerAnimation();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          borderColor: theme.palette.border,
          backgroundColor: theme.palette.panelSoft,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        },
      ]}>
      <View style={styles.content}>
        <Animated.View style={[styles.layer, textAnimatedStyle]}>
          <AppText variant="label" tone="primary">
            Overload
          </AppText>
        </Animated.View>

        <Animated.View style={[styles.layer, iconAnimatedStyle]}>
          <Ionicons name="flash" size={14} color={theme.palette.accent} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  content: {
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
