import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import type { AppTheme } from '@/constants/app-themes';
import { designTokens } from '@/constants/design-system';
import { triggerSelectionHaptic } from '@/lib/haptics';
import type { WeightUnit } from '@/lib/weight';

import {
  type ExerciseHistory,
  METRIC_LABELS,
  type MetricId,
  formatBestSet,
  formatMetricDelta,
  formatMetricTick,
  formatMetricValue,
  getMetricSeries,
} from '../analytics-data';
import { ChartReadout } from './ChartReadout';
import { styles } from './ExerciseProgressCard.styles';
import { ProgressChart } from './ProgressChart';
import { SegmentedControl } from './SegmentedControl';

const { opacity } = designTokens;

const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const longDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export function ExerciseProgressCard({
  theme,
  history,
  position,
  metric,
  onMetricChange,
  onStep,
  rangeStart,
  rangeLabel,
  unit,
}: {
  theme: AppTheme;
  history: ExerciseHistory;
  position: { index: number; count: number };
  metric: MetricId;
  onMetricChange: (metric: MetricId) => void;
  onStep: (direction: -1 | 1) => void;
  rangeStart: number;
  rangeLabel: string;
  unit: WeightUnit;
}) {
  const series = useMemo(
    () => getMetricSeries(history, metric, rangeStart, unit),
    [history, metric, rangeStart, unit]
  );
  const chartData = useMemo(
    () =>
      series.points.map((point, index) => ({
        t: point.performedAt,
        v: series.values[index],
        pr: series.prFlags[index],
      })),
    [series]
  );

  // Metric switches keep the same sessions, so the selection survives them
  // and you can compare e.g. 1RM vs volume for the same day.
  const datasetKey = `${history.name}|${rangeLabel}`;
  const [selection, setSelection] = useState<{ key: string; index: number } | null>(null);
  const selectedIndex =
    selection && selection.key === datasetKey && selection.index < chartData.length ? selection.index : null;

  const prCount = series.prFlags.filter(Boolean).length;
  const count = series.values.length;

  let readout: Parameters<typeof ChartReadout>[0];
  if (selectedIndex !== null) {
    const point = series.points[selectedIndex];
    readout = {
      theme,
      eyebrow: `${longDate.format(point.performedAt)} · ${point.workoutName}`,
      value: formatMetricValue(series.values[selectedIndex], metric, unit),
      detail: `Best ${formatBestSet(point.bestSet, unit)} · ${point.setCount} ${point.setCount === 1 ? 'set' : 'sets'}`,
      isPr: series.prFlags[selectedIndex],
    };
  } else if (count > 0) {
    const delta = series.values[count - 1] - series.values[0];
    readout = {
      theme,
      eyebrow: `${METRIC_LABELS[metric].long} · latest`,
      value: formatMetricValue(series.values[count - 1], metric, unit),
      detail:
        count < 2
          ? 'Log another session to see a trend'
          : `${formatMetricDelta(delta, metric, unit)} since ${shortDate.format(series.points[0].performedAt)}`,
      trend: count < 2 ? 'flat' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    };
  } else {
    readout = {
      theme,
      eyebrow: METRIC_LABELS[metric].long,
      value: '--',
      detail: `No sessions in ${rangeLabel.toLowerCase()}`,
    };
  }

  return (
    <View style={[styles.card, { borderColor: theme.palette.border, backgroundColor: theme.palette.panel }]}>
      <View style={styles.header}>
        <StepButton theme={theme} label="‹" accessibilityLabel="Previous exercise" onPress={() => onStep(-1)} />
        <View style={styles.headerTitle}>
          <AppText variant="heading" numberOfLines={1}>
            {history.name}
          </AppText>
          <AppText variant="micro" tone="muted">
            {position.index + 1} of {position.count} exercises
          </AppText>
        </View>
        <StepButton theme={theme} label="›" accessibilityLabel="Next exercise" onPress={() => onStep(1)} />
      </View>

      {history.metrics.length > 1 ? (
        <SegmentedControl
          theme={theme}
          accessibilityLabel="Metric"
          options={history.metrics.map((id) => ({ id, label: METRIC_LABELS[id].short }))}
          value={metric}
          onChange={onMetricChange}
        />
      ) : null}

      <ChartReadout {...readout} />

      {count > 0 ? (
        <ProgressChart
          theme={theme}
          color={theme.palette.accent}
          data={chartData}
          datasetKey={datasetKey}
          selectedIndex={selectedIndex}
          onSelect={(index) => setSelection(index === null ? null : { key: datasetKey, index })}
          formatTick={(value) => formatMetricTick(value, metric)}
          formatDate={(timestamp) => shortDate.format(timestamp)}
          accessibilityLabel={`${history.name} ${METRIC_LABELS[metric].short} chart, ${count} sessions`}
        />
      ) : (
        <View style={[styles.empty, { borderColor: theme.palette.border }]}>
          <AppText tone="muted">Nothing logged in this range. Try a longer one.</AppText>
        </View>
      )}

      <View style={[styles.stats, { borderTopColor: theme.palette.border }]}>
        <Stat label="All-time best" value={formatMetricValue(series.allTimeBest, metric, unit)} />
        <Stat label="Sessions" value={String(count)} />
        <Stat label="PRs" value={prCount > 0 ? `★ ${prCount}` : '0'} accent={prCount > 0} />
      </View>
    </View>
  );
}

function StepButton({
  theme,
  label,
  accessibilityLabel,
  onPress,
}: {
  theme: AppTheme;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => {
        triggerSelectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.stepButton,
        {
          borderColor: theme.palette.border,
          backgroundColor: theme.palette.panelSoft,
          opacity: pressed ? opacity.pressedSoft : 1,
        },
      ]}>
      <AppText variant="heading">{label}</AppText>
    </Pressable>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <AppText variant="micro" tone="muted">
        {label}
      </AppText>
      <AppText tone={accent ? 'accent' : 'primary'}>{value}</AppText>
    </View>
  );
}
