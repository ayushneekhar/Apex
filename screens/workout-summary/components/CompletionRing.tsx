import { BlurMask, Canvas, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  Easing,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import type { AppTheme } from '@/constants/app-themes';

import { styles } from './CompletionRing.styles';

const STROKE = 12;
const GLOW_PAD = 16;

/** Neon arc that sweeps to `progress` (0–1) with whatever sits in the middle. */
export function CompletionRing({
  theme,
  progress,
  size,
  children,
}: {
  theme: AppTheme;
  progress: number;
  size: number;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const end = useSharedValue(reduceMotion ? progress : 0);
  const { accent, accentStrong, accentSecondary, border } = theme.palette;

  useEffect(() => {
    end.value = reduceMotion
      ? progress
      : withDelay(250, withTiming(progress, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [end, progress, reduceMotion]);

  const canvasSize = size + GLOW_PAD * 2;
  const center = canvasSize / 2;
  const radius = size / 2 - STROKE / 2;

  const arc = Skia.Path.Make();
  arc.addCircle(center, center, radius);
  // Start the sweep at 12 o'clock.
  arc.transform(
    Skia.Matrix().translate(center, center).rotate(-Math.PI / 2).translate(-center, -center)
  );

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Canvas
        style={[
          styles.canvas,
          { width: canvasSize, height: canvasSize, left: -GLOW_PAD, top: -GLOW_PAD },
        ]}
      >
        <Path path={arc} style="stroke" strokeWidth={STROKE} color={border} />
        <Path
          path={arc}
          style="stroke"
          strokeWidth={STROKE}
          strokeCap="round"
          end={end}
          color={accent}
          opacity={0.7}
        >
          <BlurMask blur={10} style="normal" />
        </Path>
        <Path path={arc} style="stroke" strokeWidth={STROKE} strokeCap="round" end={end}>
          <SweepGradient
            c={vec(center, center)}
            colors={[accentSecondary, accent, accentStrong, accentSecondary]}
          />
        </Path>
      </Canvas>
      {children}
    </View>
  );
}
