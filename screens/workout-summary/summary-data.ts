import {
  buildExerciseHistories,
  formatBestSet,
  getPrFlags,
} from '@/screens/analytics/analytics-data';
import {
  getActiveWeekStreak,
  getRecentWeekStarts,
  getWeekRuns,
  getWeekStartTimestamp,
} from '@/lib/streaks';
import { QUICK_WORKOUT_ID } from '@/constants/workout';
import type { WeightUnit } from '@/lib/weight';
import { getWorkingSets, getWorkoutSessionVolumeKg } from '@/lib/workout-session';
import type { Workout, WorkoutSession } from '@/types/workout';

export const STREAK_WEEKS_SHOWN = 8;

const XP_PER_SET = 10;
const XP_PER_PR = 50;
const VOLUME_KG_PER_XP = 100;
const LEVEL_BASE_XP = 300;
const LEVEL_STEP_XP = 100;

export type SummaryPr = {
  exerciseName: string;
  bestSet: string;
};

export type LevelProgress = {
  level: number;
  /** XP earned inside the current level. */
  xpIntoLevel: number;
  xpForLevel: number;
};

export type WorkoutSummary = {
  workoutName: string;
  sessionNumber: number;
  durationMs: number | null;
  volumeKg: number;
  /** Change vs the previous session of the same workout, or null with nothing to compare. */
  volumeDeltaPct: number | null;
  completedSets: number;
  plannedSets: number;
  totalReps: number;
  weekStreak: number;
  /** True when this session is the first of its week, so it grew the streak. */
  streakGrew: boolean;
  /** Trained flag per week, oldest first, ending with the session's week. */
  recentWeeks: boolean[];
  prs: SummaryPr[];
  xpEarned: number;
  levelBefore: LevelProgress;
  levelAfter: LevelProgress;
};

function getSessionXp(session: WorkoutSession, prCount: number): number {
  const completedSets = getWorkingSets(session.sets).filter((setEntry) => setEntry.reps > 0).length;

  return (
    completedSets * XP_PER_SET +
    Math.floor(getWorkoutSessionVolumeKg(session) / VOLUME_KG_PER_XP) +
    prCount * XP_PER_PR
  );
}

type RawPr = {
  exerciseName: string;
  bestSet: { weightKg: number; reps: number };
};

/** PRs use each exercise's headline metric, matching the analytics charts. */
function collectPrs(workouts: Workout[]) {
  const prCountBySession = new Map<string, number>();
  const prsBySession = new Map<string, RawPr[]>();

  buildExerciseHistories(workouts).forEach((history) => {
    const metric = history.metrics[0];
    const flags = getPrFlags(history.points.map((point) => point.values[metric]));

    history.points.forEach((point, index) => {
      if (!flags[index]) {
        return;
      }

      prCountBySession.set(point.sessionKey, (prCountBySession.get(point.sessionKey) ?? 0) + 1);
      const sessionPrs = prsBySession.get(point.sessionKey) ?? [];
      sessionPrs.push({ exerciseName: history.name, bestSet: point.bestSet });
      prsBySession.set(point.sessionKey, sessionPrs);
    });
  });

  return { prCountBySession, prsBySession };
}

function sumSessionXp(sessions: WorkoutSession[], prCountBySession: Map<string, number>): number {
  return sessions.reduce(
    (total, session) => total + getSessionXp(session, prCountBySession.get(session.id) ?? 0),
    0
  );
}

/** Level across every logged session, including archived workouts. */
export function getCurrentLevel(workouts: Workout[]): LevelProgress {
  const { prCountBySession } = collectPrs(workouts);
  const allSessions = workouts.flatMap((workout) => workout.sessions);

  return getLevelProgress(sumSessionXp(allSessions, prCountBySession));
}

/** Each level costs a little more than the last: 300, 400, 500… */
export function getLevelProgress(totalXp: number): LevelProgress {
  let level = 1;
  let remaining = totalXp;
  let xpForLevel = LEVEL_BASE_XP;

  while (remaining >= xpForLevel) {
    remaining -= xpForLevel;
    level += 1;
    xpForLevel = LEVEL_BASE_XP + (level - 1) * LEVEL_STEP_XP;
  }

  return { level, xpIntoLevel: remaining, xpForLevel };
}

export function buildWorkoutSummary(
  workouts: Workout[],
  workoutId: string,
  sessionId: string,
  unit: WeightUnit
): WorkoutSummary | null {
  const workout = workouts.find((candidate) => candidate.id === workoutId);
  const session = workout?.sessions.find((candidate) => candidate.id === sessionId);

  if (!workout || !session) {
    return null;
  }

  const allSessions = workouts.flatMap((candidate) => candidate.sessions);
  const earlierSessions = allSessions.filter(
    (candidate) => candidate.id !== session.id && candidate.performedAt <= session.performedAt
  );

  const { prCountBySession, prsBySession } = collectPrs(workouts);
  const prs = (prsBySession.get(session.id) ?? []).map((pr) => ({
    exerciseName: pr.exerciseName,
    bestSet: formatBestSet(pr.bestSet, unit),
  }));

  const xpBefore = sumSessionXp(earlierSessions, prCountBySession);
  const xpEarned = getSessionXp(session, prs.length);

  // Quick workouts vary every time, so comparing them to each other means nothing.
  const previousSession = workout.id === QUICK_WORKOUT_ID ? undefined : workout.sessions
    .filter((candidate) => candidate.id !== session.id && candidate.performedAt <= session.performedAt)
    .sort((a, b) => b.performedAt - a.performedAt)[0];
  const volumeKg = getWorkoutSessionVolumeKg(session);
  const previousVolumeKg = previousSession ? getWorkoutSessionVolumeKg(previousSession) : 0;

  const earlierPerformedAts = earlierSessions.map((candidate) => candidate.performedAt);
  const weekRuns = getWeekRuns([...earlierPerformedAts, session.performedAt], session.performedAt);
  const sessionWeek = getWeekStartTimestamp(session.performedAt);
  const trainedWeeks = new Set(weekRuns.runByWeek.keys());

  const workingSets = getWorkingSets(session.sets);
  const completedSets = workingSets.filter((setEntry) => setEntry.reps > 0);

  return {
    workoutName: workout.name,
    sessionNumber: earlierSessions.length + 1,
    durationMs: session.durationMs,
    volumeKg,
    volumeDeltaPct:
      previousVolumeKg > 0 ? ((volumeKg - previousVolumeKg) / previousVolumeKg) * 100 : null,
    completedSets: completedSets.length,
    plannedSets: workingSets.length,
    totalReps: completedSets.reduce((total, setEntry) => total + setEntry.reps, 0),
    weekStreak: getActiveWeekStreak(weekRuns),
    streakGrew: !earlierPerformedAts.some(
      (performedAt) => getWeekStartTimestamp(performedAt) === sessionWeek
    ),
    recentWeeks: getRecentWeekStarts(session.performedAt, STREAK_WEEKS_SHOWN).map((week) =>
      trainedWeeks.has(week)
    ),
    prs,
    xpEarned,
    levelBefore: getLevelProgress(xpBefore),
    levelAfter: getLevelProgress(xpBefore + xpEarned),
  };
}
