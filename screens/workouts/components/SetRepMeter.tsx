import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import type { AppTheme } from '@/constants/app-themes';

import { styles } from './SetRepMeter.styles';

const FILL_EASING = Easing.bezier(0.2, 0, 0, 1);
const FILL_DURATION_MS = 280;

type SetRepMeterProps = {
  theme: AppTheme;
  setNumber: number;
  actualReps: number;
  targetReps: number;
  previousReps: number | null;
};

function getFillFraction(actualReps: number, targetReps: number): number {
  if (actualReps <= 0) {
    return 0;
  }

  if (targetReps <= 0) {
    return 1;
  }

  return Math.min(actualReps / targetReps, 1);
}

function SetRepMeterLabels({
  setNumber,
  actualReps,
  targetReps,
  previousReps,
  inverse,
}: Omit<SetRepMeterProps, 'theme'> & { inverse: boolean }) {
  const completed = actualReps > 0;
  const mutedTone = inverse ? 'inverse' : 'muted';

  return (
    <>
      <AppText variant="micro" tone={mutedTone} style={inverse ? styles.inverseMuted : null}>
        Set {setNumber}
      </AppText>
      <AppText variant="heading" tone={inverse ? 'inverse' : completed ? 'accent' : 'primary'}>
        {completed ? actualReps : '--'}
      </AppText>
      <AppText variant="micro" tone={mutedTone} style={inverse ? styles.inverseMuted : null}>
        / {targetReps}
      </AppText>
      <AppText variant="micro" tone={mutedTone} style={inverse ? styles.inverseMuted : null}>
        Prev {previousReps ?? '--'}
      </AppText>
    </>
  );
}

/**
 * Vertical rep progress meter. The accent fill rises from the bottom in
 * proportion to actual/target reps, and an inverse-colored copy of the labels
 * is clipped to the fill so text reads correctly on either side of the edge.
 */
export function SetRepMeter({ theme, ...labelProps }: SetRepMeterProps) {
  const [meterHeight, setMeterHeight] = useState(0);
  const fraction = getFillFraction(labelProps.actualReps, labelProps.targetReps);
  const progress = useSharedValue(fraction);

  useEffect(() => {
    progress.value = withTiming(fraction, {
      duration: FILL_DURATION_MS,
      easing: FILL_EASING,
    });
  }, [fraction, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    height: progress.value * meterHeight,
  }));

  return (
    <View
      style={styles.meter}
      onLayout={(event) => {
        setMeterHeight(event.nativeEvent.layout.height);
      }}
    >
      <View style={styles.labels}>
        <SetRepMeterLabels {...labelProps} inverse={false} />
      </View>

      <Animated.View
        pointerEvents="none"
        style={[styles.fill, { backgroundColor: theme.palette.accent }, fillStyle]}
      >
        <View style={[styles.labels, styles.inverseLabels, { height: meterHeight }]}>
          <SetRepMeterLabels {...labelProps} inverse />
        </View>
      </Animated.View>
    </View>
  );
}
