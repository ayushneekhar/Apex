import { BlurMask, Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import {
  Easing,
  clamp,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { AppTheme } from '@/constants/app-themes';

import { styles } from './CalendarHeatLayer.styles';

const DAYS_PER_WEEK = 7;
const MIN_FILL_ALPHA = 0.22;
/** Fill alpha above which the day number switches to inverse text. */
const INVERSE_TEXT_ALPHA = 0.7;
/** Only days at least this intense get a bloom. */
const GLOW_MIN_INTENSITY = 0.6;
const REVEAL_DURATION_MS = 700;
/** Share of the reveal spent fading day fills in before streak links start drawing. */
const LINK_REVEAL_DELAY = 0.3;

export type CalendarHeatCell = {
  key: string;
  isWorkoutDay: boolean;
  /** 0–1 training load relative to the heaviest day on record. */
  intensity: number;
  /** Streak run the day belongs to, or null when its week isn't part of a multi-week streak. */
  streakRunId: number | null;
  isActiveStreak: boolean;
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
  streakRunId: number | null;
  isActiveStreak: boolean;
};

/**
 * Skia layer drawn under the calendar's day cells: workout days are filled by
 * training load, and days inside a multi-week streak are joined into a
 * constellation (the current streak glows, older ones stay dim).
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
  const { accent, accentStrong, panel } = theme.palette;

  const { days, activeLinks, pastLinks } = useMemo(() => {
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
          streakRunId: cell.streakRunId,
          isActiveStreak: cell.isActiveStreak,
        });
      });
    });

    const active = Skia.Path.Make();
    const past = Skia.Path.Make();

    // Cells are already chronological, so neighbours in `placed` are consecutive sessions.
    for (let index = 1; index < placed.length; index += 1) {
      const from = placed[index - 1];
      const to = placed[index];

      if (from.streakRunId === null || from.streakRunId !== to.streakRunId) {
        continue;
      }

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= dayRadius * 2) {
        continue;
      }

      // Run edge to edge so the link never crosses a translucent fill.
      const ux = dx / distance;
      const uy = dy / distance;
      const target = from.isActiveStreak ? active : past;
      target.moveTo(from.x + ux * dayRadius, from.y + uy * dayRadius);
      target.lineTo(to.x - ux * dayRadius, to.y - uy * dayRadius);
    }

    return { days: placed, activeLinks: active, pastLinks: past };
  }, [dayRadius, rowGap, rowHeight, weeks, width]);

  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = 0;
    reveal.value = withTiming(1, {
      duration: REVEAL_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [animationKey, reveal]);

  const fillOpacity = useDerivedValue(() => clamp(reveal.value / LINK_REVEAL_DELAY, 0, 1));
  const linkEnd = useDerivedValue(() =>
    clamp((reveal.value - LINK_REVEAL_DELAY) / (1 - LINK_REVEAL_DELAY), 0, 1)
  );

  if (width <= 0 || days.length === 0) {
    return null;
  }

  return (
    <Canvas pointerEvents="none" style={styles.canvas}>
      <Path path={pastLinks} style="stroke" strokeWidth={1.5} strokeCap="round" color={accent} opacity={0.3} end={linkEnd} />
      <Path path={activeLinks} style="stroke" strokeWidth={5} strokeCap="round" color={accent} opacity={0.55} end={linkEnd}>
        <BlurMask blur={5} style="normal" />
      </Path>
      <Path path={activeLinks} style="stroke" strokeWidth={1.5} strokeCap="round" color={accentStrong} end={linkEnd} />

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
