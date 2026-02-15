import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { type lineDataItem, LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import { designTokens } from '@/constants/design-system';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatWeightFromKg } from '@/lib/weight';
import { useAppStore } from '@/store/use-app-store';
import { styles } from './AnalyticsScreen.styles';

type SessionSummary = {
  workoutName: string;
  performedAt: number;
  bodyweightKg: number | null;
  sets: {
    exerciseName: string;
    reps: number;
    weightKg: number;
  }[];
};

type MetricPoint = {
  label: string;
  valueKg: number;
};

function toPercentChange(start: number, end: number): string {
  if (start <= 0) {
    return 'N/A';
  }

  const delta = ((end - start) / start) * 100;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

function MetricLineChart({
  points,
  lineColor,
  fillEndColor,
  axisColor,
  mutedColor,
}: {
  points: MetricPoint[];
  lineColor: string;
  fillEndColor: string;
  axisColor: string;
  mutedColor: string;
}) {
  if (points.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <AppText tone="muted">Not enough logged data yet.</AppText>
      </View>
    );
  }

  const labelStride = points.length > 6 ? 2 : 1;
  const baseData: lineDataItem[] = points.map((point, index) => ({
    value: Number(point.valueKg.toFixed(2)),
    label: index % labelStride === 0 ? point.label : '',
  }));
  const hasSinglePoint = baseData.length === 1;
  const chartData: lineDataItem[] = hasSinglePoint
    ? [
        baseData[0],
        {
          value: baseData[0].value,
          label: '',
          hideDataPoint: true,
        },
      ]
    : baseData;
  const peakValue = Math.max(...chartData.map((point) => point.value ?? 0), 1);

  return (
    <View style={styles.chartWrap}>
      <LineChart
        areaChart={!hasSinglePoint}
        curved={!hasSinglePoint}
        isAnimated
        animateOnDataChange
        animationDuration={850}
        data={chartData}
        height={188}
        noOfSections={4}
        maxValue={Math.ceil(peakValue * 1.08)}
        thickness={3}
        color={lineColor}
        startFillColor={lineColor}
        endFillColor={fillEndColor}
        startOpacity={0.26}
        endOpacity={0.06}
        yAxisColor={axisColor}
        xAxisColor={axisColor}
        rulesColor={axisColor}
        yAxisTextStyle={[styles.chartAxisText, { color: mutedColor }]}
        xAxisLabelTextStyle={[styles.chartAxisText, { color: mutedColor }]}
        yAxisLabelWidth={44}
        hideDataPoints={false}
        dataPointsRadius={4}
        dataPointsColor={lineColor}
        adjustToWidth
        spacing={42}
        initialSpacing={10}
        endSpacing={10}
        xAxisLabelsHeight={36}
        xAxisLabelsVerticalShift={8}
        hideOrigin
        showVerticalLines={false}
        showXAxisIndices={false}
        showYAxisIndices={false}
      />
    </View>
  );
}

export default function AnalyticsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { layout } = designTokens;

  const workouts = useAppStore((state) => state.workouts);
  const settings = useAppStore((state) => state.settings);

  const sessionLabelFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const sessionTimeFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const allSessions = useMemo(() => {
    const flattened: SessionSummary[] = [];

    workouts.forEach((workout) => {
      workout.sessions.forEach((session) => {
        flattened.push({
          workoutName: workout.name,
          performedAt: session.performedAt,
          bodyweightKg: session.bodyweightKg,
          sets: session.sets.map((setEntry) => ({
            exerciseName: setEntry.exerciseName,
            reps: setEntry.reps,
            weightKg: setEntry.weightKg,
          })),
        });
      });
    });

    return flattened.sort((a, b) => a.performedAt - b.performedAt);
  }, [workouts]);

  const exerciseProgress = useMemo(() => {
    const map = new Map<string, { performedAt: number; valueKg: number }[]>();

    allSessions.forEach((session) => {
      const byExercise = new Map<string, { weightedKg: number; reps: number }>();

      session.sets.forEach((setEntry) => {
        if (setEntry.reps <= 0) {
          return;
        }

        const existing = byExercise.get(setEntry.exerciseName);
        const weighted = Math.abs(setEntry.weightKg) * setEntry.reps;

        if (existing) {
          existing.weightedKg += weighted;
          existing.reps += setEntry.reps;
          return;
        }

        byExercise.set(setEntry.exerciseName, {
          weightedKg: weighted,
          reps: setEntry.reps,
        });
      });

      byExercise.forEach((value, exerciseName) => {
        if (value.reps <= 0) {
          return;
        }

        const existingSeries = map.get(exerciseName);
        const point = {
          performedAt: session.performedAt,
          valueKg: value.weightedKg / value.reps,
        };

        if (existingSeries) {
          existingSeries.push(point);
          return;
        }

        map.set(exerciseName, [point]);
      });
    });

    map.forEach((series) => {
      series.sort((a, b) => a.performedAt - b.performedAt);
    });

    return map;
  }, [allSessions]);

  const exerciseNames = useMemo(() => {
    return [...exerciseProgress.keys()].sort((a, b) => a.localeCompare(b));
  }, [exerciseProgress]);

  const exerciseAnalyticsCards = useMemo(() => {
    return exerciseNames.map((exerciseName) => {
      const series = exerciseProgress.get(exerciseName) ?? [];

      return {
        exerciseName,
        points: series.slice(-10).map((point) => ({
          label: sessionLabelFormatter.format(new Date(point.performedAt)),
          valueKg: point.valueKg,
        })),
        startValueKg: series.length > 0 ? series[0].valueKg : null,
        latestValueKg: series.length > 0 ? series[series.length - 1].valueKg : null,
      };
    });
  }, [exerciseNames, exerciseProgress, sessionLabelFormatter]);

  const bodyweightSeries = useMemo(() => {
    return allSessions.filter((session) => session.bodyweightKg !== null && session.bodyweightKg > 0);
  }, [allSessions]);

  const recentBodyweightPoints = useMemo(() => {
    return bodyweightSeries.slice(-10).map((session) => ({
      label: sessionLabelFormatter.format(new Date(session.performedAt)),
      valueKg: session.bodyweightKg ?? 0,
    }));
  }, [bodyweightSeries, sessionLabelFormatter]);

  const sessionCount = allSessions.length;
  const latestSession = allSessions.length > 0 ? allSessions[allSessions.length - 1] : null;

  const bodyweightStart = bodyweightSeries.length > 0 ? bodyweightSeries[0].bodyweightKg : null;
  const bodyweightLatest =
    bodyweightSeries.length > 0 ? bodyweightSeries[bodyweightSeries.length - 1].bodyweightKg : null;

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.palette.background,
        },
      ]}>
      <NeonGridBackground />

      <ScrollView
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
        <View
          style={[
            styles.hero,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}>
          <AppText variant="display">Analytics</AppText>
          <AppText tone="muted">
            Track exercise load progression and bodyweight trends across completed sessions.
          </AppText>
        </View>

        <View
          style={[
            styles.summaryRow,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}>
          <View style={styles.summaryCell}>
            <AppText variant="micro" tone="muted">
              Completed Sessions
            </AppText>
            <AppText variant="heading">{sessionCount}</AppText>
          </View>
          <View style={styles.summaryCell}>
            <AppText variant="micro" tone="muted">
              Last Workout
            </AppText>
            <AppText variant="heading">
              {latestSession ? sessionTimeFormatter.format(new Date(latestSession.performedAt)) : 'None'}
            </AppText>
            {latestSession ? (
              <AppText variant="micro" tone="muted">
                {latestSession.workoutName}
              </AppText>
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}>
          <AppText variant="heading">Exercise Progression</AppText>

          {exerciseAnalyticsCards.length > 0 ? (
            <View style={styles.exercisePanelsWrap}>
              {exerciseAnalyticsCards.map((exerciseCard) => (
                <View
                  key={exerciseCard.exerciseName}
                  style={[
                    styles.exercisePanel,
                    {
                      borderColor: theme.palette.border,
                      backgroundColor: theme.palette.panelSoft,
                    },
                  ]}>
                  <AppText variant="label">{exerciseCard.exerciseName}</AppText>

                  <MetricLineChart
                    points={exerciseCard.points}
                    lineColor={theme.palette.accent}
                    fillEndColor={theme.palette.panelSoft}
                    axisColor={theme.palette.border}
                    mutedColor={theme.palette.textMuted}
                  />

                  <View style={styles.metricRow}>
                    <View
                      style={[
                        styles.metricCard,
                        {
                          borderColor: theme.palette.border,
                          backgroundColor: theme.palette.panel,
                        },
                      ]}>
                      <AppText variant="micro" tone="muted">
                        First Avg Load
                      </AppText>
                      <AppText tone="accent">
                        {exerciseCard.startValueKg === null
                          ? 'N/A'
                          : formatWeightFromKg(Math.abs(exerciseCard.startValueKg), settings.weightUnit)}
                      </AppText>
                    </View>
                    <View
                      style={[
                        styles.metricCard,
                        {
                          borderColor: theme.palette.border,
                          backgroundColor: theme.palette.panel,
                        },
                      ]}>
                      <AppText variant="micro" tone="muted">
                        Latest Avg Load
                      </AppText>
                      <AppText tone="accent">
                        {exerciseCard.latestValueKg === null
                          ? 'N/A'
                          : formatWeightFromKg(Math.abs(exerciseCard.latestValueKg), settings.weightUnit)}
                      </AppText>
                    </View>
                  </View>

                  <AppText tone="muted">
                    Change:{' '}
                    {exerciseCard.startValueKg !== null && exerciseCard.latestValueKg !== null
                      ? toPercentChange(Math.abs(exerciseCard.startValueKg), Math.abs(exerciseCard.latestValueKg))
                      : 'N/A'}
                  </AppText>
                </View>
              ))}
            </View>
          ) : (
            <AppText tone="muted">Complete workouts to unlock exercise analytics.</AppText>
          )}
        </View>

        <View
          style={[
            styles.card,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}>
          <AppText variant="heading">Bodyweight Trend</AppText>

          <MetricLineChart
            points={recentBodyweightPoints}
            lineColor={theme.palette.accentSecondary}
            fillEndColor={theme.palette.panelSoft}
            axisColor={theme.palette.border}
            mutedColor={theme.palette.textMuted}
          />

          <View style={styles.metricRow}>
            <View
              style={[
                styles.metricCard,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panelSoft,
                },
              ]}>
              <AppText variant="micro" tone="muted">
                First Logged
              </AppText>
              <AppText tone="accent">
                {bodyweightStart === null ? 'N/A' : formatWeightFromKg(bodyweightStart, settings.weightUnit)}
              </AppText>
            </View>
            <View
              style={[
                styles.metricCard,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panelSoft,
                },
              ]}>
              <AppText variant="micro" tone="muted">
                Latest Logged
              </AppText>
              <AppText tone="accent">
                {bodyweightLatest === null ? 'N/A' : formatWeightFromKg(bodyweightLatest, settings.weightUnit)}
              </AppText>
            </View>
          </View>

          <AppText tone="muted">
            Change:{' '}
            {bodyweightStart !== null && bodyweightLatest !== null
              ? toPercentChange(bodyweightStart, bodyweightLatest)
              : 'N/A'}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}
