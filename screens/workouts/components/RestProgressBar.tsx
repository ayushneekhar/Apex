import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  RoundedRect,
  Skia,
  useClock,
  vec,
} from '@shopify/react-native-skia';
import { useState } from 'react';
import { View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import type { AppTheme } from '@/constants/app-themes';
import type { ActiveRestTimer } from '@/types/workout';

import { REST_BAR_GLOW_PAD, REST_BAR_HEIGHT, styles } from './RestProgressBar.styles';

export type RestPhase = 'counting' | 'ready' | 'overtime';

const RADIUS = REST_BAR_HEIGHT / 2;
const BAR_Y = REST_BAR_GLOW_PAD;
const BAR_CENTER_Y = BAR_Y + RADIUS;

/** Glow breathing period per phase — calm while resting, urgent once overdue. */
const PULSE_PERIOD_MS: Record<RestPhase, number> = {
  counting: 1800,
  ready: 1200,
  overtime: 750,
};

/**
 * Neon rest bar. Fill is computed from the timer's timestamps on the UI thread
 * every frame, so it glides instead of stepping with the 1s JS tick. Once rest
 * runs over, the right-hand segment shows overtime as a share of total rest.
 */
export function RestProgressBar({
  theme,
  restTimer,
  phase,
}: {
  theme: AppTheme;
  restTimer: ActiveRestTimer;
  phase: RestPhase;
}) {
  const [canvasWidth, setCanvasWidth] = useState(0);
  const clock = useClock();
  // Wall time when the frame clock started. The fill derives "now" from this plus
  // the clock instead of calling Date.now() inside the worklet on the UI runtime.
  const [clockOrigin] = useState(Date.now);
  const { endsAt, durationMs } = restTimer;
  const { accent, accentStrong, border, danger, panel, success } = theme.palette;
  const barWidth = Math.max(0, canvasWidth - REST_BAR_GLOW_PAD * 2);
  const periodMs = PULSE_PERIOD_MS[phase];

  const track = Skia.RRectXY(
    Skia.XYWHRect(REST_BAR_GLOW_PAD, BAR_Y, barWidth, REST_BAR_HEIGHT),
    RADIUS,
    RADIUS
  );

  /** Width (px) of the rested portion; the remainder is overtime. */
  const baseWidth = useDerivedValue(() => {
    const now = clockOrigin + clock.value;
    const overtimeMs = Math.max(0, now - endsAt);

    if (overtimeMs > 0) {
      return (barWidth * durationMs) / (durationMs + overtimeMs);
    }

    if (durationMs <= 0) {
      return barWidth;
    }

    return barWidth * Math.min(1, Math.max(0, 1 - (endsAt - now) / durationMs));
  });

  const pulse = useDerivedValue(
    () => 0.5 + 0.5 * Math.sin((clock.value / periodMs) * Math.PI * 2)
  );

  const baseEnd = useDerivedValue(() => vec(REST_BAR_GLOW_PAD + baseWidth.value, 0));
  const overtimeX = useDerivedValue(() => REST_BAR_GLOW_PAD + baseWidth.value);
  const overtimeWidth = useDerivedValue(() => barWidth - baseWidth.value);
  const headCenter = useDerivedValue(() =>
    vec(REST_BAR_GLOW_PAD + Math.max(RADIUS, baseWidth.value - RADIUS), BAR_CENTER_Y)
  );

  const headGlowOpacity = useDerivedValue(() => 0.35 + 0.45 * pulse.value);
  const barGlowOpacity = useDerivedValue(() => 0.2 + 0.6 * pulse.value);

  const baseColor = phase === 'counting' ? accent : success;
  const baseHighlight = phase === 'counting' ? accentStrong : success;
  // Overtime dims the rested segment so the red segment carries the attention.
  const baseOpacity = phase === 'overtime' ? 0.55 : 1;

  return (
    <View
      style={styles.container}
      onLayout={(event) => setCanvasWidth(event.nativeEvent.layout.width)}
    >
      {barWidth > 0 ? (
        <Canvas style={styles.canvas}>
          {phase === 'counting' ? (
            <Circle c={headCenter} r={REST_BAR_HEIGHT} color={accentStrong} opacity={headGlowOpacity}>
              <BlurMask blur={7} style="normal" />
            </Circle>
          ) : null}
          {phase === 'ready' ? (
            <RoundedRect rect={track} color={success} opacity={barGlowOpacity}>
              <BlurMask blur={8} style="normal" />
            </RoundedRect>
          ) : null}
          {phase === 'overtime' ? (
            <RoundedRect
              x={overtimeX}
              y={BAR_Y}
              width={overtimeWidth}
              height={REST_BAR_HEIGHT}
              r={RADIUS}
              color={danger}
              opacity={barGlowOpacity}
            >
              <BlurMask blur={8} style="normal" />
            </RoundedRect>
          ) : null}

          <RoundedRect rect={track} color={panel} />

          <Group clip={track}>
            <RoundedRect
              x={REST_BAR_GLOW_PAD}
              y={BAR_Y}
              width={baseWidth}
              height={REST_BAR_HEIGHT}
              r={RADIUS}
              opacity={baseOpacity}
            >
              <LinearGradient
                start={vec(REST_BAR_GLOW_PAD, 0)}
                end={baseEnd}
                colors={[`${baseColor}40`, baseColor, baseHighlight]}
                positions={[0, 0.7, 1]}
              />
            </RoundedRect>
            {phase === 'overtime' ? (
              <RoundedRect
                x={overtimeX}
                y={BAR_Y}
                width={overtimeWidth}
                height={REST_BAR_HEIGHT}
                r={RADIUS}
              >
                <LinearGradient
                  start={vec(REST_BAR_GLOW_PAD + barWidth, 0)}
                  end={baseEnd}
                  colors={[`${danger}66`, danger]}
                />
              </RoundedRect>
            ) : null}
          </Group>

          <RoundedRect rect={track} style="stroke" strokeWidth={1} color={border} />
        </Canvas>
      ) : null}
    </View>
  );
}
