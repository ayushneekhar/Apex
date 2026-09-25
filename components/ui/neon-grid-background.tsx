import {
  Canvas,
  Group,
  LinearGradient,
  Path,
  Rect,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform, useWindowDimensions } from 'react-native';
import {
  SensorType,
  clamp,
  useAnimatedReaction,
  useAnimatedSensor,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';
import {
  NEON_GRID_DEFAULT_LINE_GAP,
  NEON_GRID_PARALLAX_GRID_SHIFT,
  NEON_GRID_WASH_OPACITY,
  styles,
} from '@/components/ui/neon-grid-background.styles';
import { designTokens } from '@/constants/design-system';

const STANDARD_GRAVITY = 9.81;
// CoreMotion reports gravity pointing at the earth; Android reports the reaction
// force. Flip iOS so both platforms tilt the grid the same way.
const GRAVITY_SIGN = Platform.OS === 'ios' ? -1 : 1;
/** Gravity delta (in g) that maps to full parallax travel — roughly a 15° tilt. */
const FULL_TILT_G = 0.26;
/** Per-sample pull of the resting angle toward the current one, so any hold re-centers. */
const NEUTRAL_DRIFT = 0.012;
/** Per-sample low-pass toward the raw reading to hide sensor jitter. */
const TILT_SMOOTHING = 0.16;
const RECENTER_SPRING = { damping: 18, stiffness: 90 };

type NeonGridBackgroundProps = {
  lineGap?: number;
};

function useAppIsActive() {
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setIsActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  return isActive;
}

/**
 * Feeds device tilt into `tiltX`/`tiltY` as [-1, 1] offsets from a slowly
 * drifting neutral pose, so the grid reacts to tilting rather than to however
 * the phone happens to be held. Mounted only while the background is visible.
 */
function TiltSensor({ tiltX, tiltY }: { tiltX: SharedValue<number>; tiltY: SharedValue<number> }) {
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 'auto' });
  const neutralX = useSharedValue<number | null>(null);
  const neutralY = useSharedValue(0);

  useAnimatedReaction(
    () => gravity.sensor.value,
    (reading) => {
      // The sensor reports all zeros until its first real sample.
      if (reading.x === 0 && reading.y === 0 && reading.z === 0) {
        return;
      }

      const x = clamp((GRAVITY_SIGN * reading.x) / STANDARD_GRAVITY, -1, 1);
      const y = clamp((GRAVITY_SIGN * reading.y) / STANDARD_GRAVITY, -1, 1);

      if (neutralX.value === null) {
        neutralX.value = x;
        neutralY.value = y;
      }

      const restX = neutralX.value + (x - neutralX.value) * NEUTRAL_DRIFT;
      const restY = neutralY.value + (y - neutralY.value) * NEUTRAL_DRIFT;
      neutralX.value = restX;
      neutralY.value = restY;

      const targetX = clamp((x - restX) / FULL_TILT_G, -1, 1);
      const targetY = clamp((y - restY) / FULL_TILT_G, -1, 1);
      tiltX.value += (targetX - tiltX.value) * TILT_SMOOTHING;
      tiltY.value += (targetY - tiltY.value) * TILT_SMOOTHING;
    }
  );

  return null;
}

export function NeonGridBackground({ lineGap = NEON_GRID_DEFAULT_LINE_GAP }: NeonGridBackgroundProps) {
  const theme = useAppTheme();
  const { width, height } = useWindowDimensions();
  const { border } = designTokens;
  const { accent, background, backgroundAlt, gridLine } = theme.palette;

  const isFocused = useIsFocused();
  const appIsActive = useAppIsActive();
  const reduceMotion = useReducedMotion();
  const parallaxEnabled = isFocused && appIsActive && !reduceMotion;

  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  useEffect(() => {
    if (!parallaxEnabled) {
      tiltX.value = withSpring(0, RECENTER_SPRING);
      tiltY.value = withSpring(0, RECENTER_SPRING);
    }
  }, [parallaxEnabled, tiltX, tiltY]);

  // One path for every line, overscanned by a cell so parallax never reveals an edge.
  const gridPath = useMemo(() => {
    const path = Skia.Path.Make();
    const offset = border.thin / 2;

    for (let x = -lineGap; x <= width + lineGap; x += lineGap) {
      path.moveTo(x + offset, -lineGap);
      path.lineTo(x + offset, height + lineGap);
    }
    for (let y = -lineGap; y <= height + lineGap; y += lineGap) {
      path.moveTo(-lineGap, y + offset);
      path.lineTo(width + lineGap, y + offset);
    }

    return path;
  }, [border.thin, height, lineGap, width]);

  const gridTransform = useDerivedValue(() => [
    { translateX: tiltX.value * NEON_GRID_PARALLAX_GRID_SHIFT },
    { translateY: tiltY.value * NEON_GRID_PARALLAX_GRID_SHIFT },
  ]);

  return (
    <>
      {parallaxEnabled ? <TiltSensor tiltX={tiltX} tiltY={tiltY} /> : null}

      <Canvas pointerEvents="none" style={styles.canvas}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={[background, background, backgroundAlt, background]}
            positions={[0, 0.45, 0.82, 1]}
          />
        </Rect>

        <Rect x={0} y={0} width={width} height={height} opacity={NEON_GRID_WASH_OPACITY}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={[`${accent}22`, `${accent}00`]}
          />
        </Rect>

        <Group transform={gridTransform}>
          <Path path={gridPath} style="stroke" strokeWidth={border.thin} color={gridLine} />
        </Group>
      </Canvas>
    </>
  );
}
