import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatWeightFromKg } from '@/lib/weight';
import { useAppStore } from '@/store/use-app-store';

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
  id: string;
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

function MetricBarChart({
  points,
  accentColor,
  mutedColor,
}: {
  points: MetricPoint[];
  accentColor: string;
  mutedColor: string;
}) {
  if (points.length === 0) {
    return (
      <View style={styles.chartEmpty}>
        <AppText tone="muted">Not enough logged data yet.</AppText>
      </View>
    );
  }

  const maxValue = Math.max(...points.map((point) => point.valueKg), 1);

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartBarsRow}>
        {points.map((point) => {
          const normalized = Math.max(0.06, point.valueKg / maxValue);

          return (
            <View key={point.id} style={styles.chartBarCell}>
              <View style={styles.chartBarTrack}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: `${Math.round(normalized * 100)}%`,
                      backgroundColor: accentColor,
                    },
                  ]}
                />
              </View>
              <AppText variant="micro" tone="muted" style={[styles.chartLabel, { color: mutedColor }]}>
                {point.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const workouts = useAppStore((state) => state.workouts);
  const settings = useAppStore((state) => state.settings);

  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

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

  useEffect(() => {
    if (exerciseNames.length === 0) {
      setSelectedExercise(null);
      return;
    }

    if (!selectedExercise || !exerciseProgress.has(selectedExercise)) {
      setSelectedExercise(exerciseNames[0]);
    }
  }, [exerciseNames, exerciseProgress, selectedExercise]);

  const selectedSeries = useMemo(() => {
    if (!selectedExercise) {
      return [];
    }

    return exerciseProgress.get(selectedExercise) ?? [];
  }, [exerciseProgress, selectedExercise]);

  const recentExercisePoints = useMemo(() => {
    return selectedSeries.slice(-10).map((point, index) => ({
      id: `${point.performedAt}-${index}`,
      label: sessionLabelFormatter.format(new Date(point.performedAt)),
      valueKg: point.valueKg,
    }));
  }, [selectedSeries, sessionLabelFormatter]);

  const bodyweightSeries = useMemo(() => {
    return allSessions.filter((session) => session.bodyweightKg !== null && session.bodyweightKg > 0);
  }, [allSessions]);

  const recentBodyweightPoints = useMemo(() => {
    return bodyweightSeries.slice(-10).map((session, index) => ({
      id: `${session.performedAt}-bw-${index}`,
      label: sessionLabelFormatter.format(new Date(session.performedAt)),
      valueKg: session.bodyweightKg ?? 0,
    }));
  }, [bodyweightSeries, sessionLabelFormatter]);

  const sessionCount = allSessions.length;
  const latestSession = allSessions.length > 0 ? allSessions[allSessions.length - 1] : null;

  const exerciseStart = selectedSeries.length > 0 ? selectedSeries[0].valueKg : null;
  const exerciseLatest = selectedSeries.length > 0 ? selectedSeries[selectedSeries.length - 1].valueKg : null;

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
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 96,
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

          {exerciseNames.length > 0 ? (
            <View style={styles.exerciseChipWrap}>
              {exerciseNames.map((exerciseName) => {
                const selected = selectedExercise === exerciseName;

                return (
                  <Pressable
                    key={exerciseName}
                    onPress={() => setSelectedExercise(exerciseName)}
                    style={({ pressed }) => [
                      styles.exerciseChip,
                      {
                        borderColor: selected ? theme.palette.accent : theme.palette.border,
                        backgroundColor: selected ? `${theme.palette.accent}2a` : theme.palette.panelSoft,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}>
                    <AppText variant="micro" tone={selected ? 'accent' : 'muted'}>
                      {exerciseName}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <AppText tone="muted">Complete workouts to unlock exercise analytics.</AppText>
          )}

          {selectedExercise ? (
            <>
              <MetricBarChart
                points={recentExercisePoints}
                accentColor={theme.palette.accent}
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
                    First Avg Load
                  </AppText>
                  <AppText tone="accent">
                    {exerciseStart === null
                      ? 'N/A'
                      : formatWeightFromKg(Math.abs(exerciseStart), settings.weightUnit)}
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
                    Latest Avg Load
                  </AppText>
                  <AppText tone="accent">
                    {exerciseLatest === null
                      ? 'N/A'
                      : formatWeightFromKg(Math.abs(exerciseLatest), settings.weightUnit)}
                  </AppText>
                </View>
              </View>

              <AppText tone="muted">
                Change:{' '}
                {exerciseStart !== null && exerciseLatest !== null
                  ? toPercentChange(Math.abs(exerciseStart), Math.abs(exerciseLatest))
                  : 'N/A'}
              </AppText>
            </>
          ) : null}
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

          <MetricBarChart
            points={recentBodyweightPoints}
            accentColor={theme.palette.accentSecondary}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 14,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  summaryRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  summaryCell: {
    flex: 1,
    gap: 5,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  exerciseChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exerciseChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chartWrap: {
    paddingTop: 6,
  },
  chartBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 136,
  },
  chartBarCell: {
    flex: 1,
    gap: 6,
    alignItems: 'center',
  },
  chartBarTrack: {
    width: '100%',
    minHeight: 110,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'flex-end',
    padding: 4,
  },
  chartBar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 6,
  },
  chartLabel: {
    textAlign: 'center',
  },
  chartEmpty: {
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
});
