import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import { designTokens } from '@/constants/design-system';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAppStore } from '@/store/use-app-store';
import {
  type ExerciseHistory,
  type MetricId,
  RANGE_OPTIONS,
  type RangeId,
  buildBodyweightSeries,
  buildExerciseHistories,
  formatMetricValue,
  getMetricSeries,
  getRangeStart,
} from './analytics/analytics-data';
import { BodyweightCard } from './analytics/components/BodyweightCard';
import { ExerciseList } from './analytics/components/ExerciseList';
import { ExerciseProgressCard } from './analytics/components/ExerciseProgressCard';
import { SegmentedControl } from './analytics/components/SegmentedControl';
import { styles } from './AnalyticsScreen.styles';

const RANGE_LABELS: Record<RangeId, string> = {
  '1M': 'The last month',
  '3M': 'The last 3 months',
  '6M': 'The last 6 months',
  '1Y': 'The last year',
  ALL: 'All time',
};

export default function AnalyticsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { layout } = designTokens;

  const workouts = useAppStore((state) => state.workouts);
  const unit = useAppStore((state) => state.settings.weightUnit);

  const [range, setRange] = useState<RangeId>('ALL');
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [preferredMetric, setPreferredMetric] = useState<MetricId>('e1rm');

  const scrollRef = useRef<ScrollView>(null);
  const progressCardY = useRef(0);

  const histories = useMemo(() => buildExerciseHistories(workouts), [workouts]);
  const bodyweightSeries = useMemo(() => buildBodyweightSeries(workouts), [workouts]);
  const rangeStart = useMemo(() => getRangeStart(range, Date.now()), [range]);

  const selectedIndex = Math.max(
    0,
    histories.findIndex((history) => history.name === selectedName)
  );
  const selectedHistory = histories[selectedIndex] as ExerciseHistory | undefined;

  // Bodyweight lifts can't show a 1RM, so fall back to their first metric
  // without forgetting the preference for the next weighted exercise.
  const getMetric = (history: ExerciseHistory): MetricId =>
    history.metrics.includes(preferredMetric) ? preferredMetric : history.metrics[0];

  const summary = useMemo(() => {
    const sessionIds = new Set<string>();
    let volumeKg = 0;
    let prCount = 0;

    histories.forEach((history) => {
      history.points.forEach((point) => {
        if (point.performedAt >= rangeStart) {
          sessionIds.add(point.sessionKey);
          volumeKg += point.values.volume;
        }
      });
      prCount += getMetricSeries(history, history.metrics[0], rangeStart, unit).prFlags.filter(Boolean).length;
    });

    return { sessions: sessionIds.size, volumeKg, prCount };
  }, [histories, rangeStart, unit]);

  const selectExercise = (name: string) => {
    setSelectedName(name);
    scrollRef.current?.scrollTo({ y: Math.max(0, progressCardY.current - layout.screenTopInset), animated: true });
  };

  const stepExercise = (direction: -1 | 1) => {
    if (histories.length === 0) {
      return;
    }

    const next = (selectedIndex + direction + histories.length) % histories.length;
    setSelectedName(histories[next].name);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.palette.background }]}>
      <NeonGridBackground />

      <ScrollView
        ref={scrollRef}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + layout.screenTopInset,
            paddingBottom: insets.bottom + layout.screenBottomInset,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="display">Analytics</AppText>
          <SegmentedControl
            theme={theme}
            accessibilityLabel="Time range"
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
          />
        </View>

        <View style={[styles.summaryRow, { borderColor: theme.palette.border, backgroundColor: theme.palette.panel }]}>
          <SummaryCell label="Sessions" value={String(summary.sessions)} />
          <View style={[styles.summaryDivider, { backgroundColor: theme.palette.border }]} />
          <SummaryCell label="Volume" value={formatMetricValue(summary.volumeKg, 'volume', unit)} />
          <View style={[styles.summaryDivider, { backgroundColor: theme.palette.border }]} />
          <SummaryCell label="PRs" value={summary.prCount > 0 ? `★ ${summary.prCount}` : '0'} accent={summary.prCount > 0} />
        </View>

        {selectedHistory ? (
          <>
            <View
              onLayout={(event) => {
                progressCardY.current = event.nativeEvent.layout.y;
              }}>
              <ExerciseProgressCard
                theme={theme}
                history={selectedHistory}
                position={{ index: selectedIndex, count: histories.length }}
                metric={getMetric(selectedHistory)}
                onMetricChange={setPreferredMetric}
                onStep={stepExercise}
                rangeStart={rangeStart}
                rangeLabel={RANGE_LABELS[range]}
                unit={unit}
              />
            </View>

            <ExerciseList
              theme={theme}
              histories={histories}
              selectedName={selectedHistory.name}
              getMetric={getMetric}
              onSelect={selectExercise}
              rangeStart={rangeStart}
              unit={unit}
            />
          </>
        ) : (
          <View style={[styles.emptyCard, { borderColor: theme.palette.border, backgroundColor: theme.palette.panel }]}>
            <AppText variant="heading">No sessions yet</AppText>
            <AppText tone="muted">Finish a workout and your progress charts will show up here.</AppText>
          </View>
        )}

        <BodyweightCard
          theme={theme}
          series={bodyweightSeries}
          rangeStart={rangeStart}
          rangeLabel={RANGE_LABELS[range]}
          unit={unit}
        />
      </ScrollView>
    </View>
  );
}

function SummaryCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.summaryCell}>
      <AppText variant="micro" tone="muted">
        {label}
      </AppText>
      <AppText variant="heading" tone={accent ? 'accent' : 'primary'} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}
