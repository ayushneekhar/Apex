import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import type { AppTheme } from '@/constants/app-themes';
import { designTokens } from '@/constants/design-system';
import { useAppTheme } from '@/hooks/use-app-theme';
import { triggerMediumImpactHaptic, triggerSuccessHaptic } from '@/lib/haptics';
import { convertKgToUnit } from '@/lib/weight';
import { useAppStore } from '@/store/use-app-store';
import type { RootStackParamList } from '@/types/navigation';

import { CompletionRing } from './workout-summary/components/CompletionRing';
import { ConfettiBurst } from './workout-summary/components/ConfettiBurst';
import { buildWorkoutSummary, type LevelProgress } from './workout-summary/summary-data';
import { useCountUp } from './workout-summary/use-count-up';
import { formatDuration } from './workouts/utils';
import { RING_SIZE, styles } from './WorkoutSummaryScreen.styles';

type WorkoutSummaryNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'WorkoutSummary'
>;
type WorkoutSummaryRouteProp = RouteProp<RootStackParamList, 'WorkoutSummary'>;

/** Delay before each card's entrance, so the screen builds up top to bottom. */
const STAGGER_MS = 110;
const XP_BAR_DELAY_MS = 900;

function formatCount(value: number): string {
  const rounded = Math.round(value);
  return Math.abs(rounded) >= 10_000
    ? `${Number((rounded / 1000).toFixed(1))}k`
    : rounded.toLocaleString();
}

function enterAt(step: number) {
  return FadeInDown.delay(step * STAGGER_MS).duration(420).easing(Easing.out(Easing.cubic));
}

function StatTile({
  theme,
  icon,
  label,
  value,
  unit,
  badge,
}: {
  theme: AppTheme;
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  unit?: string;
  badge?: { text: string; positive: boolean } | null;
}) {
  return (
    <View
      style={[
        styles.tile,
        { borderColor: theme.palette.border, backgroundColor: theme.palette.panel },
      ]}
    >
      <View style={styles.tileHeader}>
        <Ionicons
          name={icon}
          size={designTokens.sizes.iconTiny}
          color={theme.palette.textMuted}
        />
        <AppText variant="micro" tone="muted">
          {label}
        </AppText>
      </View>
      <View style={styles.tileValueRow}>
        <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </AppText>
        {unit ? (
          <AppText variant="micro" tone="muted" style={styles.tileUnit}>
            {unit}
          </AppText>
        ) : null}
      </View>
      {badge ? (
        <AppText variant="micro" tone={badge.positive ? 'success' : 'danger'}>
          {badge.text}
        </AppText>
      ) : null}
    </View>
  );
}

function XpBar({
  theme,
  before,
  after,
}: {
  theme: AppTheme;
  before: LevelProgress;
  after: LevelProgress;
}) {
  const fill = useSharedValue(before.xpIntoLevel / before.xpForLevel);
  const leveledUp = after.level > before.level;

  useEffect(() => {
    const target = after.xpIntoLevel / after.xpForLevel;
    const timing = { duration: 800, easing: Easing.out(Easing.cubic) };

    // A level-up tops the bar off, then refills it from empty for the new level.
    fill.value = withDelay(
      XP_BAR_DELAY_MS,
      leveledUp
        ? withSequence(withTiming(1, timing), withTiming(0, { duration: 0 }), withTiming(target, timing))
        : withTiming(target, timing)
    );
  }, [after, fill, leveledUp]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View style={[styles.xpTrack, { backgroundColor: theme.palette.panelSoft }]}>
      <Animated.View
        style={[
          styles.xpFill,
          { backgroundColor: theme.palette.accent, shadowColor: theme.palette.accent },
          fillStyle,
        ]}
      />
    </View>
  );
}

export default function WorkoutSummaryScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<WorkoutSummaryNavigationProp>();
  const route = useRoute<WorkoutSummaryRouteProp>();
  const { layout } = designTokens;

  const { workoutId, sessionId } = route.params;
  const workouts = useAppStore((state) => state.workouts);
  const weightUnit = useAppStore((state) => state.settings.weightUnit);

  // Snapshot once: later edits to history shouldn't reshuffle the celebration.
  const [summary] = useState(() =>
    buildWorkoutSummary(workouts, workoutId, sessionId, weightUnit)
  );

  useEffect(() => {
    if (!summary) {
      return;
    }

    triggerSuccessHaptic();

    if (summary.levelAfter.level > summary.levelBefore.level) {
      const timeout = setTimeout(triggerMediumImpactHaptic, XP_BAR_DELAY_MS + 800);
      return () => clearTimeout(timeout);
    }
  }, [summary]);

  const confettiColors = useMemo(
    () => [
      theme.palette.accent,
      theme.palette.accentStrong,
      theme.palette.accentSecondary,
      theme.palette.success,
      theme.palette.textPrimary,
    ],
    [theme]
  );

  const sessionNumber = useCountUp(summary?.sessionNumber ?? 0, 250, 1100);
  const weekStreak = useCountUp(summary?.weekStreak ?? 0, 2 * STAGGER_MS + 200);
  const durationMs = useCountUp(summary?.durationMs ?? 0, 3 * STAGGER_MS + 200);
  const volume = useCountUp(
    convertKgToUnit(summary?.volumeKg ?? 0, weightUnit),
    3 * STAGGER_MS + 200
  );
  const completedSets = useCountUp(summary?.completedSets ?? 0, 4 * STAGGER_MS + 200);
  const totalReps = useCountUp(summary?.totalReps ?? 0, 4 * STAGGER_MS + 200);
  const xpEarned = useCountUp(summary?.xpEarned ?? 0, XP_BAR_DELAY_MS);

  const handleDone = () => navigation.goBack();

  if (!summary) {
    return (
      <View
        style={[
          styles.screen,
          styles.missing,
          { backgroundColor: theme.palette.background, paddingBottom: insets.bottom },
        ]}
      >
        <AppText tone="muted">Workout saved.</AppText>
        <NeonButton title="Done" onPress={handleDone} />
      </View>
    );
  }

  const completion =
    summary.plannedSets > 0 ? summary.completedSets / summary.plannedSets : 1;
  const leveledUp = summary.levelAfter.level > summary.levelBefore.level;
  const volumeDelta = summary.volumeDeltaPct;
  let step = 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.palette.background }]}>
      <NeonGridBackground />

      <ScrollView
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + layout.screenTopInset,
            paddingBottom: insets.bottom + layout.screenTopInset * 2,
          },
        ]}
      >
        <Animated.View entering={enterAt(step++)} style={styles.hero}>
          <AppText variant="micro" tone="muted" numberOfLines={1}>
            {summary.workoutName}
          </AppText>
          <AppText variant="heading" tone="accent">
            Complete
          </AppText>
        </Animated.View>

        <Animated.View entering={enterAt(step++)} style={styles.ringWrap}>
          <CompletionRing theme={theme} progress={completion} size={RING_SIZE}>
            <AppText variant="micro" tone="muted">
              Workout
            </AppText>
            <AppText
              variant="display"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.ringNumber}
            >
              #{Math.round(sessionNumber)}
            </AppText>
            <AppText variant="label" tone="accent">
              {Math.round(completion * 100)}%
            </AppText>
          </CompletionRing>
        </Animated.View>

        <Animated.View
          entering={enterAt(step++)}
          style={[
            styles.card,
            styles.streakCard,
            { borderColor: theme.palette.accent, backgroundColor: theme.palette.panel },
          ]}
        >
          <View style={styles.streakMain}>
            <Ionicons name="flame" size={44} color={theme.palette.accent} />
            <View>
              <AppText variant="display" style={styles.streakNumber}>
                {Math.round(weekStreak)}
              </AppText>
              <AppText variant="micro" tone="muted">
                Week streak
              </AppText>
            </View>
            {summary.streakGrew ? (
              <View style={[styles.pill, { backgroundColor: theme.palette.accent }]}>
                <AppText variant="label" tone="inverse">
                  +1
                </AppText>
              </View>
            ) : null}
          </View>
          <View style={styles.weekPips}>
            {summary.recentWeeks.map((trained, index) => (
              <View
                key={index}
                style={[
                  styles.weekPip,
                  {
                    backgroundColor: trained ? theme.palette.accent : theme.palette.panelSoft,
                    borderColor: trained ? theme.palette.accentStrong : theme.palette.border,
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={enterAt(step++)} style={styles.tileRow}>
          <StatTile
            theme={theme}
            icon="time-outline"
            label="Time"
            value={summary.durationMs === null ? '—' : formatDuration(durationMs)}
          />
          <StatTile
            theme={theme}
            icon="barbell-outline"
            label="Volume"
            value={formatCount(volume)}
            unit={weightUnit}
            badge={
              volumeDelta === null || Math.round(volumeDelta) === 0
                ? null
                : {
                    text: `${volumeDelta > 0 ? '▲' : '▼'} ${Math.abs(Math.round(volumeDelta))}%`,
                    positive: volumeDelta > 0,
                  }
            }
          />
        </Animated.View>

        <Animated.View entering={enterAt(step++)} style={styles.tileRow}>
          <StatTile
            theme={theme}
            icon="layers-outline"
            label="Sets"
            value={String(Math.round(completedSets))}
            unit={`/ ${summary.plannedSets}`}
          />
          <StatTile
            theme={theme}
            icon="repeat-outline"
            label="Reps"
            value={formatCount(totalReps)}
          />
        </Animated.View>

        {summary.prs.length > 0 ? (
          <Animated.View
            entering={enterAt(step++)}
            style={[
              styles.card,
              { borderColor: theme.palette.success, backgroundColor: theme.palette.panel },
            ]}
          >
            <View style={styles.prHeader}>
              <Ionicons name="trophy" size={28} color={theme.palette.success} />
              <AppText variant="title" tone="success">
                {summary.prs.length}
              </AppText>
              <AppText variant="micro" tone="muted">
                {summary.prs.length === 1 ? 'New PR' : 'New PRs'}
              </AppText>
            </View>
            {summary.prs.map((pr) => (
              <View key={pr.exerciseName} style={styles.prRow}>
                <AppText tone="muted" numberOfLines={1} style={styles.prName}>
                  {pr.exerciseName}
                </AppText>
                <AppText variant="label">{pr.bestSet}</AppText>
              </View>
            ))}
          </Animated.View>
        ) : null}

        <Animated.View
          entering={enterAt(step++)}
          style={[
            styles.card,
            { borderColor: theme.palette.border, backgroundColor: theme.palette.panel },
          ]}
        >
          <View style={styles.xpHeader}>
            <AppText variant="title" tone="accent">
              +{Math.round(xpEarned)}
              <AppText variant="label" tone="accent">
                {' '}XP
              </AppText>
            </AppText>
            <View
              style={[
                styles.pill,
                leveledUp
                  ? { backgroundColor: theme.palette.accent }
                  : { borderWidth: designTokens.border.thin, borderColor: theme.palette.border },
              ]}
            >
              <AppText variant="label" tone={leveledUp ? 'inverse' : 'primary'}>
                {leveledUp ? `Lv ${summary.levelAfter.level} ▲` : `Lv ${summary.levelAfter.level}`}
              </AppText>
            </View>
          </View>
          <XpBar theme={theme} before={summary.levelBefore} after={summary.levelAfter} />
          <AppText variant="micro" tone="muted">
            {summary.levelAfter.xpIntoLevel} / {summary.levelAfter.xpForLevel}
          </AppText>
        </Animated.View>

        <Animated.View entering={enterAt(step++)} style={styles.actions}>
          <View style={styles.actionPrimary}>
            <NeonButton title="Done" onPress={handleDone} />
          </View>
          <View style={styles.actionSecondary}>
            <NeonButton
              title="Details"
              variant="ghost"
              onPress={() => navigation.replace('SessionDetails', { workoutId, sessionId })}
            />
          </View>
        </Animated.View>
      </ScrollView>

      <ConfettiBurst colors={confettiColors} originY={insets.top + RING_SIZE * 0.6} />
    </View>
  );
}
