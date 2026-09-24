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

import { formatDuration } from './workouts/utils';
import { styles } from './HistoryScreen.styles';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const DAYS_PER_WEEK = WEEKDAY_LABELS.length;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type SessionRowData = {
  workoutId: string;
  sessionId: string;
  workoutName: string;
  performedAt: number;
  dayKey: string;
  monthKey: string;
  exercisePreview: string;
  setCount: number;
  durationLabel: string | null;
  volumeLabel: string;
};

type SessionSection = {
  key: string;
  label: string;
  rows: SessionRowData[];
};

type CalendarCell = {
  key: string;
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isWorkoutDay: boolean;
  isToday: boolean;
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
  workoutDayKeys: Set<string>,
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

    return {
      key: `${dateKey}-${cellIndex}`,
      dateKey,
      dayNumber: date.getDate(),
      inCurrentMonth,
      isWorkoutDay: inCurrentMonth && workoutDayKeys.has(dateKey),
      isToday: dateKey === todayKey,
    };
  });

  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < cells.length; index += DAYS_PER_WEEK) {
    weeks.push(cells.slice(index, index + DAYS_PER_WEEK));
  }

  return weeks;
}

/** Consecutive weeks (Sun–Sat) with at least one session, counting back from this week. */
function getWeekStreak(performedAts: number[], now: number): number {
  const trainedWeeks = new Set(performedAts.map(getWeekStartTimestamp));
  let cursor = getWeekStartTimestamp(now);

  // An empty current week doesn't break the streak until it's over.
  if (!trainedWeeks.has(cursor)) {
    cursor = getWeekStartTimestamp(cursor - MS_PER_DAY);
  }

  let streak = 0;
  while (trainedWeeks.has(cursor)) {
    streak += 1;
    cursor = getWeekStartTimestamp(cursor - MS_PER_DAY);
  }

  return streak;
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
  return {
    workoutId,
    sessionId: session.id,
    workoutName,
    performedAt: session.performedAt,
    dayKey: toLocalDateKey(session.performedAt),
    monthKey: toLocalMonthKey(session.performedAt),
    exercisePreview: getExercisePreview(session),
    setCount: session.sets.length,
    durationLabel: session.durationMs === null ? null : formatDuration(session.durationMs),
    volumeLabel: formatWeightFromKg(getWorkoutSessionVolumeKg(session), weightUnit),
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
  const { layout, opacity } = designTokens;

  const workouts = useAppStore((state) => state.workouts);
  const weightUnit = useAppStore((state) => state.settings.weightUnit);
  const [calendarMonthStartTimestamp, setCalendarMonthStartTimestamp] = useState(() =>
    getMonthStartTimestamp(Date.now())
  );
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

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
  const workoutDayKeys = useMemo(() => new Set(rows.map((row) => row.dayKey)), [rows]);
  const weekStreak = useMemo(
    () => getWeekStreak(rows.map((row) => row.performedAt), Date.now()),
    [rows]
  );

  const currentMonthKey = toLocalMonthKey(Date.now());
  const calendarWeeks = useMemo(
    () => buildCalendarWeeks(calendarMonthStartTimestamp, workoutDayKeys, todayKey),
    [calendarMonthStartTimestamp, todayKey, workoutDayKeys]
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
                          backgroundColor: cell.isWorkoutDay
                            ? theme.palette.accent
                            : 'transparent',
                        },
                      ]}
                    >
                      <AppText
                        tone={cell.isWorkoutDay ? 'inverse' : 'muted'}
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
