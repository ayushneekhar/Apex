import { BlurMask, Canvas, Circle, Group } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import type { AppTheme } from '@/constants/app-themes';

import { styles } from './CalendarHeatLayer.styles';

const DAYS_PER_WEEK = 7;
const MIN_FILL_ALPHA = 0.22;
/** Fill alpha above which the day number switches to inverse text. */
const INVERSE_TEXT_ALPHA = 0.7;
/** Only days at least this intense get a bloom. */
const GLOW_MIN_INTENSITY = 0.6;
const REVEAL_DURATION_MS = 300;

export type CalendarHeatCell = {
  key: string;
  isWorkoutDay: boolean;
  /** 0–1 training load relative to the heaviest day on record. */
  intensity: number;
};

export function getHeatFillAlpha(intensity: number): number {
  return MIN_FILL_ALPHA + (1 - MIN_FILL_ALPHA) * intensity;
}

export function heatFillNeedsInverseText(intensity: number): boolean {
  return getHeatFillAlpha(intensity) >= INVERSE_TEXT_ALPHA;
}

type PlacedDay = {
  key: string;
  x: number;
  y: number;
  intensity: number;
};

/**
 * Skia layer drawn under the calendar's day cells: workout days are filled by
 * training load, and the heaviest days get a soft bloom.
 */
export function CalendarHeatLayer({
  weeks,
  width,
  rowHeight,
  rowGap,
  dayRadius,
  theme,
  animationKey,
}: {
  weeks: CalendarHeatCell[][];
  width: number;
  rowHeight: number;
  rowGap: number;
  dayRadius: number;
  theme: AppTheme;
  animationKey: string | number;
}) {
  const { accent, panel } = theme.palette;

  const days = useMemo(() => {
    const columnWidth = width / DAYS_PER_WEEK;
    const placed: PlacedDay[] = [];

    weeks.forEach((week, row) => {
      week.forEach((cell, col) => {
        if (!cell.isWorkoutDay) {
          return;
        }

        placed.push({
          key: cell.key,
          x: (col + 0.5) * columnWidth,
          y: row * (rowHeight + rowGap) + rowHeight / 2,
          intensity: cell.intensity,
        });
      });
    });

    return placed;
  }, [rowGap, rowHeight, weeks, width]);

  const fillOpacity = useSharedValue(0);

  useEffect(() => {
    fillOpacity.value = 0;
    fillOpacity.value = withTiming(1, {
      duration: REVEAL_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [animationKey, fillOpacity]);

  if (width <= 0 || days.length === 0) {
    return null;
  }

  return (
    <Canvas pointerEvents="none" style={styles.canvas}>
      <Group opacity={fillOpacity}>
        {days.map((day) =>
          day.intensity >= GLOW_MIN_INTENSITY ? (
            <Circle
              key={`glow-${day.key}`}
              cx={day.x}
              cy={day.y}
              r={dayRadius}
              color={accent}
              opacity={(day.intensity - GLOW_MIN_INTENSITY) * 1.2 + 0.2}
            >
              <BlurMask blur={8} style="outer" />
            </Circle>
          ) : null
        )}
        {days.map((day) => (
          <Group key={day.key}>
            <Circle cx={day.x} cy={day.y} r={dayRadius} color={panel} />
            <Circle cx={day.x} cy={day.y} r={dayRadius} color={accent} opacity={getHeatFillAlpha(day.intensity)} />
          </Group>
        ))}
      </Group>
    </Canvas>
  );
}
