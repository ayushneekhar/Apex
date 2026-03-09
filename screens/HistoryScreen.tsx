import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import { designTokens } from '@/constants/design-system';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  getWorkoutSessionVolumeKg,
  groupWorkoutSessionSets,
} from '@/lib/workout-session';
import { formatWeightFromKg } from '@/lib/weight';
import { useAppStore } from '@/store/use-app-store';
import type { RootStackParamList } from '@/types/navigation';
import type { WorkoutSession } from '@/types/workout';

import { formatDuration } from './workouts/utils';
import { styles } from './HistoryScreen.styles';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type SessionListItem = {
  workoutId: string;
  workoutName: string;
  session: WorkoutSession;
};

type CalendarCell = {
  key: string;
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

function getMonthStartTimestamp(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function shiftCalendarMonth(monthStartTimestamp: number, deltaMonths: number): number {
  const date = new Date(monthStartTimestamp);
  return new Date(date.getFullYear(), date.getMonth() + deltaMonths, 1).getTime();
}

function buildCalendarCells(
  monthStartTimestamp: number,
  workoutDayKeys: Set<string>,
  todayKey: string
): CalendarCell[] {
  const firstDay = new Date(monthStartTimestamp);
  const year = firstDay.getFullYear();
  const monthIndex = firstDay.getMonth();
  const monthStartsOnWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();
  const visibleCellCount =
    Math.ceil((monthStartsOnWeekday + daysInMonth) / WEEKDAY_LABELS.length) *
    WEEKDAY_LABELS.length;

  return Array.from({ length: visibleCellCount }, (_, cellIndex) => {
    const isLeadingCell = cellIndex < monthStartsOnWeekday;
    const isTrailingCell = cellIndex >= monthStartsOnWeekday + daysInMonth;

    let dayNumber = 0;
    let date: Date;
    let inCurrentMonth = false;

    if (isLeadingCell) {
      dayNumber = daysInPrevMonth - monthStartsOnWeekday + cellIndex + 1;
      date = new Date(year, monthIndex - 1, dayNumber);
    } else if (isTrailingCell) {
      dayNumber = cellIndex - monthStartsOnWeekday - daysInMonth + 1;
      date = new Date(year, monthIndex + 1, dayNumber);
    } else {
      dayNumber = cellIndex - monthStartsOnWeekday + 1;
      date = new Date(year, monthIndex, dayNumber);
      inCurrentMonth = true;
    }

    const dateKey = toLocalDateKey(date.getTime());

    return {
      key: `${dateKey}-${cellIndex}`,
      dayNumber,
      inCurrentMonth,
      isWorkoutDay: inCurrentMonth && workoutDayKeys.has(dateKey),
      isToday: dateKey === todayKey,
    };
  });
}

function toCalendarWeeks(cells: CalendarCell[]): CalendarCell[][] {
  const weeks: CalendarCell[][] = [];

  for (let index = 0; index < cells.length; index += WEEKDAY_LABELS.length) {
    weeks.push(cells.slice(index, index + WEEKDAY_LABELS.length));
  }

  return weeks;
}

function getExercisePreview(session: WorkoutSession): string {
  const groups = groupWorkoutSessionSets(session.sets);
  const previewNames = groups.slice(0, 3).map((group) => group.exerciseName);
  const remainingCount = groups.length - previewNames.length;

  if (previewNames.length === 0) {
    return 'No exercises logged';
  }

  if (remainingCount <= 0) {
    return previewNames.join(' • ');
  }

  return `${previewNames.join(' • ')} +${remainingCount}`;
}

export default function HistoryScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { layout, opacity } = designTokens;

  const workouts = useAppStore((state) => state.workouts);
  const settings = useAppStore((state) => state.settings);
  const [calendarMonthStartTimestamp, setCalendarMonthStartTimestamp] = useState(() =>
    getMonthStartTimestamp(Date.now())
  );

  const sessionDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    []
  );
  const shortLastWorkoutFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    []
  );
  const fullLastWorkoutFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    []
  );
  const dateBadgeDayFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { day: '2-digit' }),
    []
  );
  const dateBadgeMonthFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'short' }),
    []
  );

  const sessions = useMemo(() => {
    const flattened: SessionListItem[] = [];

    workouts.forEach((workout) => {
      workout.sessions.forEach((session) => {
        flattened.push({
          workoutId: workout.id,
          workoutName: workout.name,
          session,
        });
      });
    });

    return flattened.sort((a, b) => b.session.performedAt - a.session.performedAt);
  }, [workouts]);

  const todayKey = useMemo(() => toLocalDateKey(Date.now()), []);
  const workoutDayKeys = useMemo(() => {
    const days = new Set<string>();

    sessions.forEach((item) => {
      days.add(toLocalDateKey(item.session.performedAt));
    });

    return days;
  }, [sessions]);

  const calendarMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        year: 'numeric',
      }).format(new Date(calendarMonthStartTimestamp)),
    [calendarMonthStartTimestamp]
  );

  const calendarCells = useMemo(
    () => buildCalendarCells(calendarMonthStartTimestamp, workoutDayKeys, todayKey),
    [calendarMonthStartTimestamp, todayKey, workoutDayKeys]
  );
  const calendarWeeks = useMemo(() => toCalendarWeeks(calendarCells), [calendarCells]);

  const completedDaysInMonth = useMemo(
    () => calendarCells.filter((cell) => cell.inCurrentMonth && cell.isWorkoutDay).length,
    [calendarCells]
  );

  const totalSessions = sessions.length;
  const lastSession = sessions[0] ?? null;
  const lastWorkoutTimestamp = useMemo(() => {
    if (!lastSession) {
      return 'None';
    }

    const performedAtDate = new Date(lastSession.session.performedAt);
    const currentYear = new Date().getFullYear();
    const formatter =
      performedAtDate.getFullYear() === currentYear
        ? shortLastWorkoutFormatter
        : fullLastWorkoutFormatter;

    return formatter.format(performedAtDate);
  }, [fullLastWorkoutFormatter, lastSession, shortLastWorkoutFormatter]);

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.palette.background,
        },
      ]}
    >
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
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <AppText variant="title">Past Workouts</AppText>
          <AppText tone="muted">
            Tap any log to open a cleaner session view, review every exercise, and edit the sets there.
          </AppText>
        </View>

        <View
          style={[
            styles.summaryRow,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <View style={styles.summaryCell}>
            <AppText variant="micro" tone="muted">
              Total Sessions
            </AppText>
            <AppText variant="heading">{totalSessions}</AppText>
          </View>
          <View style={styles.summaryCell}>
            <AppText variant="micro" tone="muted">
              Last Workout
            </AppText>
            <AppText variant="heading">{lastWorkoutTimestamp}</AppText>
          </View>
        </View>

        <View
          style={[
            styles.calendarCard,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <View style={styles.calendarHeader}>
            <View style={styles.calendarTitleWrap}>
              <AppText variant="heading">Consistency Calendar</AppText>
              <AppText tone="muted">Highlighted days are days you trained.</AppText>
            </View>

            <View style={styles.calendarMonthRow}>
              <Pressable
                onPress={() => {
                  setCalendarMonthStartTimestamp((current) =>
                    shiftCalendarMonth(current, -1)
                  );
                }}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.calendarNavButton,
                  {
                    borderColor: theme.palette.border,
                    backgroundColor: theme.palette.panelSoft,
                    opacity: pressed ? opacity.pressedSoft : 1,
                  },
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={theme.palette.textPrimary}
                />
              </Pressable>
              <AppText numberOfLines={1} style={styles.calendarMonthLabel}>
                {calendarMonthLabel}
              </AppText>
              <Pressable
                onPress={() => {
                  setCalendarMonthStartTimestamp((current) =>
                    shiftCalendarMonth(current, 1)
                  );
                }}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.calendarNavButton,
                  {
                    borderColor: theme.palette.border,
                    backgroundColor: theme.palette.panelSoft,
                    opacity: pressed ? opacity.pressedSoft : 1,
                  },
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={theme.palette.textPrimary}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.calendarWeekRow}>
            {WEEKDAY_LABELS.map((weekday) => (
              <View key={weekday} style={styles.calendarWeekCell}>
                <AppText variant="micro" tone="muted" style={styles.calendarWeekLabel}>
                  {weekday}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarWeeks.map((week, weekIndex) => (
              <View key={`calendar-week-${weekIndex}`} style={styles.calendarGridWeekRow}>
                {week.map((cell) => (
                  <View key={cell.key} style={styles.calendarDayCellSlot}>
                    <View
                      style={[
                        styles.calendarDayCell,
                        {
                          borderColor: cell.isToday
                            ? theme.palette.accentSecondary
                            : theme.palette.border,
                          backgroundColor: cell.isWorkoutDay
                            ? `${theme.palette.accent}30`
                            : cell.inCurrentMonth
                            ? theme.palette.panelSoft
                            : `${theme.palette.background}66`,
                        },
                      ]}
                    >
                      {cell.inCurrentMonth ? (
                        <View style={styles.calendarDayLabelWrap}>
                          <AppText
                            tone={cell.isWorkoutDay ? 'accent' : 'primary'}
                            style={styles.calendarDayLabel}
                          >
                            {cell.dayNumber}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>

          <AppText variant="micro" tone="muted">
            {completedDaysInMonth} training day{completedDaysInMonth === 1 ? '' : 's'} this month.
          </AppText>
        </View>

        {sessions.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="heading">No sessions logged yet</AppText>
            <AppText tone="muted">
              Finish a workout from the Workouts tab to populate your history.
            </AppText>
          </View>
        ) : null}

        {sessions.map((item) => {
          const sessionDate = new Date(item.session.performedAt);
          const groupedSets = groupWorkoutSessionSets(item.session.sets);
          const totalReps = item.session.sets.reduce(
            (total, setEntry) => total + setEntry.reps,
            0
          );
          const totalVolumeKg = getWorkoutSessionVolumeKg(item.session);
          const durationLabel =
            item.session.durationMs === null
              ? 'Unknown'
              : formatDuration(item.session.durationMs);
          const bodyweightLabel =
            item.session.bodyweightKg === null
              ? 'Bodyweight not logged'
              : formatWeightFromKg(item.session.bodyweightKg, settings.weightUnit);

          return (
            <Pressable
              key={item.session.id}
              onPress={() =>
                navigation.navigate('SessionDetails', {
                  workoutId: item.workoutId,
                  sessionId: item.session.id,
                })
              }
              style={({ pressed }) => [
                styles.sessionCard,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panel,
                  opacity: pressed ? opacity.pressedSoft : 1,
                },
              ]}
            >
              <View style={styles.sessionTopRow}>
                <View
                  style={[
                    styles.sessionDateBadge,
                    {
                      borderColor: theme.palette.border,
                      backgroundColor: theme.palette.panelSoft,
                    },
                  ]}
                >
                  <AppText variant="heading">
                    {dateBadgeDayFormatter.format(sessionDate)}
                  </AppText>
                  <AppText variant="micro" tone="muted">
                    {dateBadgeMonthFormatter.format(sessionDate).toUpperCase()}
                  </AppText>
                </View>

                <View style={styles.sessionCardBody}>
                  <View style={styles.sessionHeadlineRow}>
                    <View style={styles.sessionHeaderText}>
                      <AppText variant="heading">{item.workoutName}</AppText>
                      <AppText tone="muted">
                        {sessionDateFormatter.format(sessionDate)}
                      </AppText>
                    </View>

                    <View
                      style={[
                        styles.volumeBadge,
                        {
                          borderColor: theme.palette.accent,
                          backgroundColor: `${theme.palette.accent}14`,
                        },
                      ]}
                    >
                      <AppText variant="micro" tone="muted">
                        Volume
                      </AppText>
                      <AppText variant="label" tone="accent">
                        {formatWeightFromKg(totalVolumeKg, settings.weightUnit)}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.statsGrid}>
                    <View
                      style={[
                        styles.statCard,
                        {
                          borderColor: theme.palette.border,
                          backgroundColor: theme.palette.panelSoft,
                        },
                      ]}
                    >
                      <AppText variant="micro" tone="muted">
                        Exercises
                      </AppText>
                      <AppText variant="heading">{groupedSets.length}</AppText>
                    </View>
                    <View
                      style={[
                        styles.statCard,
                        {
                          borderColor: theme.palette.border,
                          backgroundColor: theme.palette.panelSoft,
                        },
                      ]}
                    >
                      <AppText variant="micro" tone="muted">
                        Sets
                      </AppText>
                      <AppText variant="heading">{item.session.sets.length}</AppText>
                    </View>
                    <View
                      style={[
                        styles.statCard,
                        {
                          borderColor: theme.palette.border,
                          backgroundColor: theme.palette.panelSoft,
                        },
                      ]}
                    >
                      <AppText variant="micro" tone="muted">
                        Reps
                      </AppText>
                      <AppText variant="heading">{totalReps}</AppText>
                    </View>
                    <View
                      style={[
                        styles.statCard,
                        {
                          borderColor: theme.palette.border,
                          backgroundColor: theme.palette.panelSoft,
                        },
                      ]}
                    >
                      <AppText variant="micro" tone="muted">
                        Duration
                      </AppText>
                      <AppText variant="heading">{durationLabel}</AppText>
                    </View>
                  </View>

                  <View style={styles.sessionFooterRow}>
                    <View style={styles.sessionFooterText}>
                      <AppText variant="micro" tone="muted">
                        Exercise Preview
                      </AppText>
                      <AppText numberOfLines={1}>{getExercisePreview(item.session)}</AppText>
                    </View>
                    <View
                      style={[
                        styles.bodyweightBadge,
                        {
                          borderColor: theme.palette.border,
                          backgroundColor: theme.palette.panelSoft,
                        },
                      ]}
                    >
                      <AppText variant="micro" tone="muted">
                        Bodyweight
                      </AppText>
                      <AppText numberOfLines={1}>{bodyweightLabel}</AppText>
                    </View>
                  </View>

                  <View style={styles.linkRow}>
                    <AppText variant="label" tone="accent">
                      Open session log
                    </AppText>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={theme.palette.accent}
                    />
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
