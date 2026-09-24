import {
  BlurMask,
  Circle,
  DashPathEffect,
  Group,
  LinearGradient,
  Line as SkiaLine,
  Skia,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Area, CartesianChart, Line, Scatter, useChartPressState, type ChartBounds } from 'victory-native';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/app-text';
import type { AppTheme } from '@/constants/app-themes';
import { triggerMediumImpactHaptic, triggerSelectionHaptic } from '@/lib/haptics';

import { styles } from './ProgressChart.styles';

const AXIS_FONT = require('@expo-google-fonts/unbounded/400Regular/Unbounded_400Regular.ttf');

const REVEAL_EASING = Easing.bezier(0.2, 0, 0, 1);
const REVEAL_DURATION_MS = 900;
const MORPH_ANIMATION = { type: 'timing', duration: 420, easing: REVEAL_EASING } as const;
const MARKER_SPRING = { damping: 22, stiffness: 320, mass: 0.6 };
const CHART_HEIGHT = 196;

export type ProgressChartDatum = {
  t: number;
  v: number;
  pr: boolean;
};

type ProgressChartProps = {
  theme: AppTheme;
  color: string;
  data: ProgressChartDatum[];
  /** Changing this replays the draw-in; data changes under the same key morph instead. */
  datasetKey: string;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  formatTick: (value: number) => string;
  formatDate: (timestamp: number) => string;
  accessibilityLabel: string;
};

function getYDomain(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;
  const pad = spread === 0 ? Math.max(Math.abs(max) * 0.08, 1) : spread * 0.14;

  return [min - pad, max + pad];
}

/**
 * Interactive progression line: drag horizontally to scrub between sessions,
 * tap a session to pin it (tap it again to clear). PR sessions carry a star.
 */
export function ProgressChart({
  theme,
  color,
  data,
  datasetKey,
  selectedIndex,
  onSelect,
  formatTick,
  formatDate,
  accessibilityLabel,
}: ProgressChartProps) {
  const font = useFont(AXIS_FONT, 10);
  const { state: pressState } = useChartPressState({ x: 0, y: { v: 0 } });
  const reveal = useSharedValue(0);
  const xScaleRef = useRef<((value: number) => number) | null>(null);

  // Morph only when the sessions stay the same (metric switch). A new
  // exercise or range has a different point count, which Skia can't
  // interpolate, so it gets a fresh draw-in instead.
  const lastKeyRef = useRef(datasetKey);
  const shouldMorph = lastKeyRef.current === datasetKey;

  useEffect(() => {
    lastKeyRef.current = datasetKey;
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: REVEAL_DURATION_MS, easing: REVEAL_EASING });
  }, [datasetKey, reveal]);

  const latest = useRef({ data, selectedIndex, onSelect });
  latest.current = { data, selectedIndex, onSelect };

  const selectFromGesture = useCallback((index: number | null) => {
    const current = latest.current;
    if (index === current.selectedIndex) {
      return;
    }

    if (index !== null) {
      if (current.data[index]?.pr) {
        triggerMediumImpactHaptic();
      } else {
        triggerSelectionHaptic();
      }
    }

    current.onSelect(index);
  }, []);

  useAnimatedReaction(
    () => (pressState.isActive.value ? pressState.matchedIndex.value : -1),
    (index, previous) => {
      if (index >= 0 && index !== previous) {
        scheduleOnRN(selectFromGesture, index);
      }
    }
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .maxDistance(10)
        .onEnd((event, success) => {
          const xScale = xScaleRef.current;
          const current = latest.current;
          if (!success || !xScale || current.data.length === 0) {
            return;
          }

          let nearest = 0;
          current.data.forEach((datum, index) => {
            if (Math.abs(xScale(datum.t) - event.x) < Math.abs(xScale(current.data[nearest].t) - event.x)) {
              nearest = index;
            }
          });

          if (nearest === current.selectedIndex) {
            current.onSelect(null);
            return;
          }

          selectFromGesture(nearest);
        }),
    [selectFromGesture]
  );

  const yDomain = useMemo(() => getYDomain(data.map((datum) => datum.v)), [data]);
  const lastIndex = data.length - 1;
  const firstDate = data.length > 0 ? formatDate(data[0].t) : '';
  const lastDate = data.length > 0 ? formatDate(data[lastIndex].t) : '';

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const current = selectedIndex ?? lastIndex;
        const next =
          event.nativeEvent.actionName === 'increment'
            ? Math.min(lastIndex, current + 1)
            : Math.max(0, current - 1);
        onSelect(next);
      }}>
      <View style={[styles.canvas, { height: CHART_HEIGHT }]}>
        <CartesianChart
          data={data}
          xKey="t"
          yKeys={['v']}
          domain={{ y: yDomain }}
          domainPadding={{ left: 14, right: 14, top: 12, bottom: 6 }}
          padding={{ left: 2, right: 4, top: 6, bottom: 0 }}
          chartPressState={pressState}
          chartPressConfig={{ pan: { activeOffsetX: [-6, 6], failOffsetY: [-10, 10] } }}
          customGestures={Gesture.Race(tapGesture)}
          onScaleChange={(xScale) => {
            xScaleRef.current = xScale;
          }}
          frame={{ lineColor: 'transparent' }}
          xAxis={{ font: null, lineColor: 'transparent' }}
          yAxis={[
            {
              font,
              tickCount: 4,
              labelColor: theme.palette.textMuted,
              lineColor: theme.palette.border,
              lineWidth: 1,
              labelOffset: 8,
              formatYLabel: (value) => formatTick(Number(value)),
              linePathEffect: <DashPathEffect intervals={[2, 6]} />,
            },
          ]}>
          {({ points, chartBounds }) => {
            const selected = selectedIndex !== null ? points.v[selectedIndex] : undefined;
            const last = points.v[lastIndex];
            const prPoints = points.v.filter((_, index) => data[index]?.pr);
            const animate = shouldMorph ? MORPH_ANIMATION : undefined;

            return (
              <>
                <RevealGroup reveal={reveal} bounds={chartBounds}>
                  <Area points={points.v} y0={chartBounds.bottom} curveType="monotoneX" animate={animate}>
                    <LinearGradient
                      start={vec(0, chartBounds.top)}
                      end={vec(0, chartBounds.bottom)}
                      colors={[`${color}55`, `${color}14`, `${color}00`]}
                      positions={[0, 0.55, 1]}
                    />
                  </Area>
                  <Line
                    points={points.v}
                    curveType="monotoneX"
                    color={color}
                    strokeWidth={7}
                    opacity={0.45}
                    strokeCap="round"
                    animate={animate}>
                    <BlurMask blur={9} style="normal" />
                  </Line>
                  <Line
                    points={points.v}
                    curveType="monotoneX"
                    color={color}
                    strokeWidth={2.5}
                    strokeCap="round"
                    strokeJoin="round"
                    animate={animate}
                  />
                  <Scatter points={prPoints} shape="star" radius={7} color={theme.palette.panel} />
                  <Scatter points={prPoints} shape="star" radius={5.5} color={color} />
                </RevealGroup>

                {last?.y != null ? (
                  <PulseDot x={last.x} y={last.y} color={color} reveal={reveal} surface={theme.palette.panel} />
                ) : null}

                <SelectionMarker
                  x={selected?.x ?? null}
                  y={selected?.y ?? null}
                  bounds={chartBounds}
                  color={color}
                  lineColor={theme.palette.textMuted}
                  surface={theme.palette.panel}
                />
              </>
            );
          }}
        </CartesianChart>
      </View>
      <View style={styles.xLabels}>
        <AppText variant="micro" tone="muted">
          {firstDate}
        </AppText>
        <AppText variant="micro" tone="muted">
          {lastDate}
        </AppText>
      </View>
    </View>
  );
}

/** Clips its children to a rect that sweeps left to right as `reveal` goes 0 → 1. */
function RevealGroup({
  reveal,
  bounds,
  children,
}: {
  reveal: SharedValue<number>;
  bounds: ChartBounds;
  children: ReactNode;
}) {
  const clip = useDerivedValue(() => {
    const overscan = 16;
    return Skia.XYWHRect(0, 0, (bounds.right + overscan) * reveal.value, bounds.bottom + overscan);
  });

  return <Group clip={clip}>{children}</Group>;
}

/** Latest session: solid dot with a soft breathing halo, shown once the line lands. */
function PulseDot({
  x,
  y,
  color,
  surface,
  reveal,
}: {
  x: number;
  y: number;
  color: string;
  surface: string;
  reveal: SharedValue<number>;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false);
  }, [pulse]);

  const visible = useDerivedValue(() => (reveal.value > 0.96 ? withTiming(1, { duration: 180 }) : 0));
  const haloRadius = useDerivedValue(() => 5 + pulse.value * 11);
  const haloOpacity = useDerivedValue(() => (1 - pulse.value) * 0.45 * visible.value);

  return (
    <Group>
      <Circle cx={x} cy={y} r={haloRadius} color={color} opacity={haloOpacity} />
      <Group opacity={visible}>
        <Circle cx={x} cy={y} r={5.5} color={surface} />
        <Circle cx={x} cy={y} r={4} color={color} />
      </Group>
    </Group>
  );
}

/** Crosshair + ringed dot that glides between sessions as the selection changes. */
function SelectionMarker({
  x,
  y,
  bounds,
  color,
  lineColor,
  surface,
}: {
  x: number | null;
  y: number | null;
  bounds: ChartBounds;
  color: string;
  lineColor: string;
  surface: string;
}) {
  const markerX = useSharedValue(x ?? 0);
  const markerY = useSharedValue(y ?? 0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (x === null || y === null) {
      opacity.value = withTiming(0, { duration: 160 });
      return;
    }

    if (opacity.value < 0.05) {
      // Appearing: jump into place, then fade in, rather than sliding in from the last spot.
      markerX.value = x;
      markerY.value = y;
    } else {
      markerX.value = withSpring(x, MARKER_SPRING);
      markerY.value = withSpring(y, MARKER_SPRING);
    }
    opacity.value = withTiming(1, { duration: 140 });
  }, [x, y, markerX, markerY, opacity]);

  const lineStart = useDerivedValue(() => vec(markerX.value, bounds.top));
  const lineEnd = useDerivedValue(() => vec(markerX.value, bounds.bottom));

  return (
    <Group opacity={opacity}>
      <SkiaLine p1={lineStart} p2={lineEnd} color={lineColor} strokeWidth={1} opacity={0.6}>
        <DashPathEffect intervals={[3, 4]} />
      </SkiaLine>
      <Circle cx={markerX} cy={markerY} r={14} color={color} opacity={0.18}>
        <BlurMask blur={6} style="normal" />
      </Circle>
      <Circle cx={markerX} cy={markerY} r={7} color={surface} />
      <Circle cx={markerX} cy={markerY} r={7} color={color} style="stroke" strokeWidth={2.5} />
      <Circle cx={markerX} cy={markerY} r={3} color={color} />
    </Group>
  );
}
