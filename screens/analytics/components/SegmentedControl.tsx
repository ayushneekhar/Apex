import { useEffect, useState } from 'react';
import { type LayoutRectangle, Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import type { AppTheme } from '@/constants/app-themes';
import { triggerSelectionHaptic } from '@/lib/haptics';

import { styles } from './SegmentedControl.styles';

const SLIDE_EASING = Easing.bezier(0.2, 0, 0, 1);
const SLIDE_DURATION_MS = 260;

/** Pill row with an accent indicator that slides to the selected option. */
export function SegmentedControl<T extends string>({
  theme,
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  theme: AppTheme;
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}) {
  const [layouts, setLayouts] = useState<Partial<Record<T, LayoutRectangle>>>({});
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const selectedLayout = layouts[value];

  useEffect(() => {
    if (!selectedLayout) {
      return;
    }

    if (indicatorWidth.value === 0) {
      indicatorX.value = selectedLayout.x;
      indicatorWidth.value = selectedLayout.width;
      return;
    }

    indicatorX.value = withTiming(selectedLayout.x, { duration: SLIDE_DURATION_MS, easing: SLIDE_EASING });
    indicatorWidth.value = withTiming(selectedLayout.width, {
      duration: SLIDE_DURATION_MS,
      easing: SLIDE_EASING,
    });
  }, [selectedLayout, indicatorX, indicatorWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
    transform: [{ translateX: indicatorX.value }],
    opacity: indicatorWidth.value === 0 ? 0 : 1,
  }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: theme.palette.panelSoft, borderColor: theme.palette.border }]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.indicator, { backgroundColor: theme.palette.accent }, indicatorStyle]}
      />
      {options.map((option) => {
        const isSelected = option.id === value;

        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            hitSlop={4}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setLayouts((current) => ({ ...current, [option.id]: layout }));
            }}
            onPress={() => {
              if (!isSelected) {
                triggerSelectionHaptic();
                onChange(option.id);
              }
            }}
            style={styles.option}>
            <AppText variant="micro" tone={isSelected ? 'inverse' : 'muted'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
