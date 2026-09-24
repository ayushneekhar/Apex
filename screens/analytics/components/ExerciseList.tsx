import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import type { AppTheme } from '@/constants/app-themes';
import { designTokens } from '@/constants/design-system';
import type { WeightUnit } from '@/lib/weight';

import {
  type ExerciseHistory,
  METRIC_LABELS,
  type MetricId,
  formatMetricDelta,
  formatMetricValue,
  getMetricSeries,
} from '../analytics-data';
import { styles } from './ExerciseList.styles';
import { Sparkline } from './Sparkline';

const { opacity } = designTokens;

const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

/** One compact row per exercise; tapping a row opens it in the chart above. */
export function ExerciseList({
  theme,
  histories,
  selectedName,
  getMetric,
  onSelect,
  rangeStart,
  unit,
}: {
  theme: AppTheme;
  histories: ExerciseHistory[];
  selectedName: string;
  getMetric: (history: ExerciseHistory) => MetricId;
  onSelect: (name: string) => void;
  rangeStart: number;
  unit: WeightUnit;
}) {
  return (
    <View style={[styles.card, { borderColor: theme.palette.border, backgroundColor: theme.palette.panel }]}>
      <View style={styles.cardHeader}>
        <AppText variant="label">All exercises</AppText>
        <AppText variant="micro" tone="muted">
          Tap to chart
        </AppText>
      </View>

      {histories.map((history, rowIndex) => {
        const metric = getMetric(history);
        const series = getMetricSeries(history, metric, rangeStart, unit);
        const count = series.values.length;
        const isSelected = history.name === selectedName;
        const delta = count >= 2 ? series.values[count - 1] - series.values[0] : null;
        const hasPr = series.prFlags.some(Boolean);

        return (
          <Pressable
            key={history.name}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${history.name}, ${METRIC_LABELS[metric].short} ${
              count > 0 ? formatMetricValue(series.values[count - 1], metric, unit) : 'not logged in range'
            }`}
            onPress={() => onSelect(history.name)}
            style={({ pressed }) => [
              styles.row,
              rowIndex > 0 ? { borderTopColor: theme.palette.border, borderTopWidth: 1 } : null,
              isSelected ? { backgroundColor: theme.palette.panelSoft } : null,
              { opacity: pressed ? opacity.pressedSoft : 1 },
            ]}>
            <View
              style={[styles.selectedBar, { backgroundColor: isSelected ? theme.palette.accent : 'transparent' }]}
            />
            <View style={styles.rowName}>
              <AppText numberOfLines={1}>
                {history.name}
                {hasPr ? <AppText tone="accent"> ★</AppText> : null}
              </AppText>
              <AppText variant="micro" tone="muted" numberOfLines={1}>
                {METRIC_LABELS[metric].short} · {shortDate.format(history.lastPerformedAt)}
              </AppText>
            </View>
            <Sparkline
              id={history.name}
              values={series.values}
              color={isSelected ? theme.palette.accent : theme.palette.textMuted}
            />
            <View style={styles.rowValue}>
              <AppText numberOfLines={1}>
                {count > 0 ? formatMetricValue(series.values[count - 1], metric, unit) : '--'}
              </AppText>
              <AppText
                variant="micro"
                numberOfLines={1}
                tone={delta === null || delta === 0 ? 'muted' : delta > 0 ? 'success' : 'danger'}>
                {delta === null ? `${count} session${count === 1 ? '' : 's'}` : formatMetricDelta(delta, metric, unit)}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
