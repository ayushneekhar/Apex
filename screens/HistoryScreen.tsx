import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import type { AppTheme } from '@/constants/app-themes';
import { designTokens } from '@/constants/design-system';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  getWorkoutSessionVolumeKg,
  groupWorkoutSessionSets,
} from '@/lib/workout-session';
import { formatWeightFromKg, type WeightUnit } from '@/lib/weight';
import { useAppStore } from '@/store/use-app-store';
import type { RootStackParamList } from '@/types/navigation';
import type { WorkoutSession } from '@/types/workout';

import {
  CalendarHeatLayer,
  getHeatFillAlpha,
  heatFillNeedsInverseText,
  type CalendarHeatCell,
} from './history/components/CalendarHeatLayer';
import { formatDuration } from './workouts/utils';
import {
  CALENDAR_DAY_BORDER_WIDTH,
  CALENDAR_DAY_SIZE,
  styles,
} from './HistoryScreen.styles';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const DAYS_PER_WEEK = WEEKDAY_LABELS.length;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const HEAT_LEGEND_STEPS = [0, 0.35, 0.7, 1] as const;

type SessionRowData = {
  workoutId: string;
  sessionId: string;
  workoutName: string;
  performedAt: number;
  dayKey: string;
  monthKey: string;
  exercisePreview: string;
  setCount: number;
  volumeKg: number;
  durationLabel: string | null;
  volumeLabel: string;
};

type SessionSection = {
  key: string;
  label: string;
  rows: SessionRowData[];
};

type CalendarCell = CalendarHeatCell & {
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
};

type WeekRuns = {
  /** Week start timestamp → index of the run of consecutive trained weeks it belongs to. */
  runByWeek: Map<number, number>;
  runLengths: number[];
  activeRunId: number | null;
};

function toLocalDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toLocalMonthKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthStartTimestamp(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function getWeekStartTimestamp(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay()).getTime();
}

function shiftCalendarMonth(monthStartTimestamp: number, deltaMonths: number): number {
  const date = new Date(monthStartTimestamp);
  return new Date(date.getFullYear(), date.getMonth() + deltaMonths, 1).getTime();
}

function buildCalendarWeeks(
  monthStartTimestamp: number,
  dayIntensities: Map<string, number>,
  weekRuns: WeekRuns,
  todayKey: string
): CalendarCell[][] {
  const firstDay = new Date(monthStartTimestamp);
  const year = firstDay.getFullYear();
  const monthIndex = firstDay.getMonth();
  const leadingDays = firstDay.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const visibleCellCount =
    Math.ceil((leadingDays + daysInMonth) / DAYS_PER_WEEK) * DAYS_PER_WEEK;

  const cells = Array.from({ length: visibleCellCount }, (_, cellIndex): CalendarCell => {
    const date = new Date(year, monthIndex, cellIndex - leadingDays + 1);
    const dateKey = toLocalDateKey(date.getTime());
    const inCurrentMonth = date.getMonth() === monthIndex;
    const isWorkoutDay = inCurrentMonth && dayIntensities.has(dateKey);
    const runId = isWorkoutDay
      ? weekRuns.runByWeek.get(getWeekStartTimestamp(date.getTime())) ?? null
      : null;
    // A single trained week isn't a streak worth drawing.
    const streakRunId = runId !== null && weekRuns.runLengths[runId] > 1 ? runId : null;

    return {
      key: `${dateKey}-${cellIndex}`,
      dateKey,
      dayNumber: date.getDate(),
      inCurrentMonth,
      isWorkoutDay,
      intensity: dayIntensities.get(dateKey) ?? 0,
      streakRunId,
      isActiveStreak: streakRunId !== null && streakRunId === weekRuns.activeRunId,
      isToday: dateKey === todayKey,
    };
  });

  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < cells.length; index += DAYS_PER_WEEK) {
    weeks.push(cells.slice(index, index + DAYS_PER_WEEK));
  }

  return weeks;
}

/**
 * Groups trained weeks (Sun–Sat) into runs of consecutive weeks. The active run
 * is the one containing this week, or last week — an empty current week doesn't
 * break the streak until it's over.
 */
function getWeekRuns(performedAts: number[], now: number): WeekRuns {
  const weeks = [...new Set(performedAts.map(getWeekStartTimestamp))].sort((a, b) => a - b);
  const runByWeek = new Map<number, number>();
  const runLengths: number[] = [];

  weeks.forEach((week, index) => {
    // Step via a mid-week day so DST shifts don't break the comparison.
    const continuesRun =
      index > 0 && getWeekStartTimestamp(weeks[index - 1] + 8 * MS_PER_DAY) === week;

    if (!continuesRun) {
      runLengths.push(0);
    }

    runLengths[runLengths.length - 1] += 1;
    runByWeek.set(week, runLengths.length - 1);
  });

  const thisWeek = getWeekStartTimestamp(now);
  const lastWeek = getWeekStartTimestamp(thisWeek - MS_PER_DAY);
  const activeRunId = runByWeek.get(thisWeek) ?? runByWeek.get(lastWeek) ?? null;

  return { runByWeek, runLengths, activeRunId };
}

/**
 * Per-day training load in [0, 1] relative to the heaviest day on record. Uses
 * whichever of volume or set count is higher so bodyweight days still register;
 * the square root keeps ordinary days from washing out next to one huge session.
 */
function getDayIntensities(rows: SessionRowData[]): Map<string, number> {
  const totals = new Map<string, { volumeKg: number; setCount: number }>();

  rows.forEach((row) => {
    const total = totals.get(row.dayKey) ?? { volumeKg: 0, setCount: 0 };
    total.volumeKg += row.volumeKg;
    total.setCount += row.setCount;
    totals.set(row.dayKey, total);
  });

  let maxVolumeKg = 0;
  let maxSetCount = 0;
  totals.forEach((total) => {
    maxVolumeKg = Math.max(maxVolumeKg, total.volumeKg);
    maxSetCount = Math.max(maxSetCount, total.setCount);
  });

  const intensities = new Map<string, number>();
  totals.forEach((total, dayKey) => {
    const load = Math.max(
      maxVolumeKg > 0 ? total.volumeKg / maxVolumeKg : 0,
      maxSetCount > 0 ? total.setCount / maxSetCount : 0
    );
    intensities.set(dayKey, Math.sqrt(load));
  });

  return intensities;
}

function getExercisePreview(session: WorkoutSession): string {
  const names = groupWorkoutSessionSets(session.sets).map((group) => group.exerciseName);

  if (names.length === 0) {
    return 'No exercises logged';
  }

  const preview = names.slice(0, 3).join(' · ');
  return names.length > 3 ? `${preview} +${names.length - 3}` : preview;
}

function buildSessionRow(
  workoutId: string,
  workoutName: string,
  session: WorkoutSession,
  weightUnit: WeightUnit
): SessionRowData {
  const volumeKg = getWorkoutSessionVolumeKg(session);

  return {
    workoutId,
    sessionId: session.id,
    workoutName,
    performedAt: session.performedAt,
    dayKey: toLocalDateKey(session.performedAt),
    monthKey: toLocalMonthKey(session.performedAt),
    exercisePreview: getExercisePreview(session),
    setCount: session.sets.length,
    volumeKg,
    durationLabel: session.durationMs === null ? null : formatDuration(session.durationMs),
    volumeLabel: formatWeightFromKg(volumeKg, weightUnit),
  };
}

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});
const monthSectionFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
});
const calendarMonthFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
});
const selectedDayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});

const SessionRow = memo(function SessionRow({
  row,
  theme,
  onOpen,
}: {
  row: SessionRowData;
  theme: AppTheme;
  onOpen: (workoutId: string, sessionId: string) => void;
}) {
  const performedAt = new Date(row.performedAt);

  return (
    <Pressable
      onPress={() => onOpen(row.workoutId, row.sessionId)}
      style={({ pressed }) => [
        styles.sessionRow,
        {
          borderColor: theme.palette.border,
          backgroundColor: pressed ? theme.palette.panelSoft : theme.palette.panel,
        },
      ]}
    >
      <View style={styles.sessionDate}>
        <AppText variant="micro" tone="muted">
          {weekdayFormatter.format(performedAt)}
        </AppText>
        <AppText variant="heading">{performedAt.getDate()}</AppText>
      </View>

      <View style={[styles.sessionDivider, { backgroundColor: theme.palette.border }]} />

      <View style={styles.sessionBody}>
        <View style={styles.sessionTitleRow}>
          <AppText variant="label" numberOfLines={1} style={styles.sessionTitle}>
            {row.workoutName}
          </AppText>
          <AppText variant="micro" tone="muted">
            {timeFormatter.format(performedAt)}
          </AppText>
        </View>

        <AppText tone="muted" numberOfLines={1} style={styles.sessionPreview}>
          {row.exercisePreview}
        </AppText>

        <View style={styles.sessionMetaRow}>
          <View style={styles.sessionMetaItem}>
            <Ionicons name="barbell-outline" size={12} color={theme.palette.accent} />
            <AppText variant="micro" tone="accent">
              {row.volumeLabel}
            </AppText>
          </View>
          <View style={styles.sessionMetaItem}>
            <Ionicons name="layers-outline" size={12} color={theme.palette.textMuted} />
            <AppText variant="micro" tone="muted">
              {row.setCount} set{row.setCount === 1 ? '' : 's'}
            </AppText>
          </View>
          {row.durationLabel ? (
            <View style={styles.sessionMetaItem}>
              <Ionicons name="time-outline" size={12} color={theme.palette.textMuted} />
              <AppText variant="micro" tone="muted">
                {row.durationLabel}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={theme.palette.textMuted} />
    </Pressable>
  );
});

export default function HistoryScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { layout, opacity, spacing } = designTokens;

  const workouts = useAppStore((state) => state.workouts);
  const weightUnit = useAppStore((state) => state.settings.weightUnit);
  const [calendarMonthStartTimestamp, setCalendarMonthStartTimestamp] = useState(() =>
    getMonthStartTimestamp(Date.now())
  );
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [calendarGridWidth, setCalendarGridWidth] = useState(0);

  const rows = useMemo(() => {
    const allRows: SessionRowData[] = [];

    workouts.forEach((workout) => {
      workout.sessions.forEach((session) => {
        allRows.push(buildSessionRow(workout.id, workout.name, session, weightUnit));
      });
    });

    return allRows.sort((a, b) => b.performedAt - a.performedAt);
  }, [weightUnit, workouts]);

  const todayKey = toLocalDateKey(Date.now());
  const dayIntensities = useMemo(() => getDayIntensities(rows), [rows]);
  const weekRuns = useMemo(
    () => getWeekRuns(rows.map((row) => row.performedAt), Date.now()),
    [rows]
  );
  const weekStreak =
    weekRuns.activeRunId === null ? 0 : weekRuns.runLengths[weekRuns.activeRunId];

  const currentMonthKey = toLocalMonthKey(Date.now());
  const calendarWeeks = useMemo(
    () => buildCalendarWeeks(calendarMonthStartTimestamp, dayIntensities, weekRuns, todayKey),
    [calendarMonthStartTimestamp, dayIntensities, todayKey, weekRuns]
  );
  const monthHasStreakLinks = calendarWeeks.some((week) =>
    week.some((cell) => cell.streakRunId !== null)
  );
  const sessionsThisMonth = useMemo(
    () => rows.filter((row) => row.monthKey === currentMonthKey).length,
    [currentMonthKey, rows]
  );

  const sections = useMemo<SessionSection[]>(() => {
    const visibleRows = selectedDayKey
      ? rows.filter((row) => row.dayKey === selectedDayKey)
      : rows;
    const grouped: SessionSection[] = [];

    visibleRows.forEach((row) => {
      const current = grouped[grouped.length - 1];

      if (current?.key === row.monthKey) {
        current.rows.push(row);
        return;
      }

      grouped.push({
        key: row.monthKey,
        label: monthSectionFormatter.format(new Date(row.performedAt)),
        rows: [row],
      });
    });

    return grouped;
  }, [rows, selectedDayKey]);

  const openSession = useCallback(
    (workoutId: string, sessionId: string) => {
      navigation.navigate('SessionDetails', { workoutId, sessionId });
    },
    [navigation]
  );

  const shiftMonth = (delta: number) => {
    setCalendarMonthStartTimestamp((current) => shiftCalendarMonth(current, delta));
  };

  const selectedDayLabel = selectedDayKey
    ? selectedDayFormatter.format(fromLocalDateKey(selectedDayKey))
    : null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.palette.background }]}>
      <NeonGridBackground />

      <ScrollView
        keyboardShouldPersistTaps="handled"
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppText variant="title">History</AppText>
          <AppText tone="muted">Tap a session to review or edit it.</AppText>
        </View>

        <View
          style={[
            styles.statStrip,
            { borderColor: theme.palette.border, backgroundColor: theme.palette.panel },
          ]}
        >
          <View style={styles.statCell}>
            <AppText variant="heading">{rows.length}</AppText>
            <AppText variant="micro" tone="muted">
              Sessions
            </AppText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.palette.border }]} />
          <View style={styles.statCell}>
            <AppText variant="heading">{sessionsThisMonth}</AppText>
            <AppText variant="micro" tone="muted">
              This month
            </AppText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.palette.border }]} />
          <View style={styles.statCell}>
            <AppText variant="heading" tone={weekStreak > 0 ? 'accent' : 'primary'}>
              {weekStreak}
            </AppText>
            <AppText variant="micro" tone="muted">
              Week streak
            </AppText>
          </View>
        </View>

        <View
          style={[
            styles.calendarCard,
            { borderColor: theme.palette.border, backgroundColor: theme.palette.panel },
          ]}
        >
          <View style={styles.calendarHeader}>
            <AppText variant="label" style={styles.calendarMonthLabel}>
              {calendarMonthFormatter.format(new Date(calendarMonthStartTimestamp))}
            </AppText>
            <Pressable
              onPress={() => shiftMonth(-1)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.calendarNavButton,
                {
                  backgroundColor: theme.palette.panelSoft,
                  opacity: pressed ? opacity.pressedSoft : 1,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={16} color={theme.palette.textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => shiftMonth(1)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.calendarNavButton,
                {
                  backgroundColor: theme.palette.panelSoft,
                  opacity: pressed ? opacity.pressedSoft : 1,
                },
              ]}
            >
              <Ionicons name="chevron-forward" size={16} color={theme.palette.textPrimary} />
            </Pressable>
          </View>

          <View style={styles.calendarRow}>
            {WEEKDAY_LABELS.map((weekday, index) => (
              <View key={`${weekday}-${index}`} style={styles.calendarCell}>
                <AppText variant="micro" tone="muted">
                  {weekday}
                </AppText>
              </View>
            ))}
          </View>

          <View
            style={styles.calendarGrid}
            onLayout={(event) => setCalendarGridWidth(event.nativeEvent.layout.width)}
          >
            <CalendarHeatLayer
              weeks={calendarWeeks}
              width={calendarGridWidth}
              rowHeight={CALENDAR_DAY_SIZE}
              rowGap={spacing.xs}
              dayRadius={CALENDAR_DAY_SIZE / 2 - CALENDAR_DAY_BORDER_WIDTH}
              theme={theme}
              animationKey={calendarMonthStartTimestamp}
            />
            {calendarWeeks.map((week) => (
              <View key={week[0].key} style={styles.calendarRow}>
                {week.map((cell) => {
                  if (!cell.inCurrentMonth) {
                    return <View key={cell.key} style={styles.calendarCell} />;
                  }

                  const isSelected = cell.dateKey === selectedDayKey;

                  return (
                    <View key={cell.key} style={styles.calendarCell}>
                      <Pressable
                        disabled={!cell.isWorkoutDay}
                        onPress={() => {
                          setSelectedDayKey((current) =>
                            current === cell.dateKey ? null : cell.dateKey
                          );
                        }}
                        style={[
                          styles.calendarDay,
                          {
                            borderColor: isSelected
                              ? theme.palette.textPrimary
                              : cell.isToday
                                ? theme.palette.accent
                                : 'transparent',
                          },
                        ]}
                      >
                        <AppText
                          tone={
                            cell.isWorkoutDay
                              ? heatFillNeedsInverseText(cell.intensity)
                                ? 'inverse'
                                : 'primary'
                              : 'muted'
                          }
                          style={[
                            styles.calendarDayLabel,
                            (cell.isWorkoutDay || cell.isToday) && styles.calendarDayLabelStrong,
                          ]}
                        >
                          {cell.dayNumber}
                        </AppText>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {rows.length > 0 ? (
            <View style={styles.calendarLegend}>
              {monthHasStreakLinks ? (
                <View style={styles.calendarLegendItem}>
                  <View
                    style={[styles.calendarLegendStreak, { backgroundColor: theme.palette.accent }]}
                  />
                  <AppText variant="micro" tone="muted">
                    Streak
                  </AppText>
                </View>
              ) : null}
              <View style={styles.calendarLegendItem}>
                <AppText variant="micro" tone="muted">
                  Light
                </AppText>
                {HEAT_LEGEND_STEPS.map((intensity) => (
                  <View
                    key={intensity}
                    style={[
                      styles.calendarLegendSwatch,
                      {
                        backgroundColor: theme.palette.accent,
                        opacity: getHeatFillAlpha(intensity),
                      },
                    ]}
                  />
                ))}
                <AppText variant="micro" tone="muted">
                  Heavy
                </AppText>
              </View>
            </View>
          ) : null}
        </View>

        {selectedDayLabel ? (
          <View style={styles.filterRow}>
            <AppText variant="label" style={styles.filterLabel}>
              {selectedDayLabel}
            </AppText>
            <Pressable
              onPress={() => setSelectedDayKey(null)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.filterClear,
                {
                  borderColor: theme.palette.border,
                  opacity: pressed ? opacity.pressedSoft : 1,
                },
              ]}
            >
              <AppText variant="micro" tone="muted">
                Show all
              </AppText>
              <Ionicons name="close" size={12} color={theme.palette.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {rows.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { borderColor: theme.palette.border, backgroundColor: theme.palette.panel },
            ]}
          >
            <Ionicons name="calendar-clear-outline" size={28} color={theme.palette.textMuted} />
            <AppText variant="label">No sessions yet</AppText>
            <AppText tone="muted" style={styles.emptyText}>
              Finish a workout from the Workouts tab and it will show up here.
            </AppText>
          </View>
        ) : null}

        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            {selectedDayKey ? null : (
              <AppText variant="micro" tone="muted" style={styles.sectionLabel}>
                {section.label}
              </AppText>
            )}
            {section.rows.map((row) => (
              <SessionRow key={row.sessionId} row={row} theme={theme} onOpen={openSession} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
