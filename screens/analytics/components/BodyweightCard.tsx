import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import type { AppTheme } from '@/constants/app-themes';
import { convertKgToUnit, type WeightUnit } from '@/lib/weight';

import { type BodyweightPoint, formatMetricDelta, formatMetricTick, formatMetricValue } from '../analytics-data';
import { ChartReadout } from './ChartReadout';
import { styles } from './ExerciseProgressCard.styles';
import { ProgressChart } from './ProgressChart';

const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const longDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export function BodyweightCard({
  theme,
  series,
  rangeStart,
  rangeLabel,
  unit,
}: {
  theme: AppTheme;
  series: BodyweightPoint[];
  rangeStart: number;
  rangeLabel: string;
  unit: WeightUnit;
}) {
  const points = useMemo(() => series.filter((point) => point.performedAt >= rangeStart), [series, rangeStart]);
  const chartData = useMemo(
    () => points.map((point) => ({ t: point.performedAt, v: convertKgToUnit(point.weightKg, unit), pr: false })),
    [points, unit]
  );

  const datasetKey = `bodyweight|${rangeLabel}`;
  const [selection, setSelection] = useState<{ key: string; index: number } | null>(null);
  const selectedIndex =
    selection && selection.key === datasetKey && selection.index < chartData.length ? selection.index : null;
  const count = chartData.length;

  let readout: Parameters<typeof ChartReadout>[0];
  if (selectedIndex !== null) {
    const change = chartData[selectedIndex].v - chartData[0].v;
    readout = {
      theme,
      eyebrow: longDate.format(points[selectedIndex].performedAt),
      value: formatMetricValue(chartData[selectedIndex].v, 'top', unit),
      detail: selectedIndex === 0 ? 'Start of range' : `${formatMetricDelta(change, 'top', unit)} from start of range`,
    };
  } else if (count > 0) {
    const change = chartData[count - 1].v - chartData[0].v;
    readout = {
      theme,
      eyebrow: 'Bodyweight · latest',
      value: formatMetricValue(chartData[count - 1].v, 'top', unit),
      // Direction isn't good or bad for bodyweight, so it stays neutral.
      detail:
        count < 2
          ? 'Log another weigh-in to see a trend'
          : `${formatMetricDelta(change, 'top', unit)} since ${shortDate.format(points[0].performedAt)}`,
    };
  } else {
    readout = {
      theme,
      eyebrow: 'Bodyweight',
      value: '--',
      detail: series.length > 0 ? `No weigh-ins in ${rangeLabel.toLowerCase()}` : 'Add bodyweight when logging a session',
    };
  }

  return (
    <View style={[styles.card, { borderColor: theme.palette.border, backgroundColor: theme.palette.panel }]}>
      <AppText variant="label">Bodyweight</AppText>
      <ChartReadout {...readout} />
      {count > 0 ? (
        <ProgressChart
          theme={theme}
          color={theme.palette.accentSecondary}
          data={chartData}
          datasetKey={datasetKey}
          selectedIndex={selectedIndex}
          onSelect={(index) => setSelection(index === null ? null : { key: datasetKey, index })}
          formatTick={(value) => formatMetricTick(value, 'top')}
          formatDate={(timestamp) => shortDate.format(timestamp)}
          accessibilityLabel={`Bodyweight chart, ${count} weigh-ins`}
        />
      ) : null}
    </View>
  );
}
