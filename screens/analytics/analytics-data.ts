import { convertKgToUnit, formatWeightFromKg, type WeightUnit } from '@/lib/weight';
import type { Workout } from '@/types/workout';

export type RangeId = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export const RANGE_OPTIONS: { id: RangeId; label: string; days: number | null }[] = [
  { id: '1M', label: '1M', days: 30 },
  { id: '3M', label: '3M', days: 91 },
  { id: '6M', label: '6M', days: 182 },
  { id: '1Y', label: '1Y', days: 365 },
  { id: 'ALL', label: 'All', days: null },
];

export type MetricId = 'e1rm' | 'top' | 'volume' | 'reps';

export const METRIC_LABELS: Record<MetricId, { short: string; long: string }> = {
  e1rm: { short: 'Est. 1RM', long: 'Estimated 1 rep max' },
  top: { short: 'Top set', long: 'Heaviest set' },
  volume: { short: 'Volume', long: 'Weight × reps' },
  reps: { short: 'Reps', long: 'Total reps' },
};

export type ExerciseSessionPoint = {
  sessionKey: string;
  performedAt: number;
  workoutName: string;
  setCount: number;
  bestSet: { weightKg: number; reps: number };
  values: Record<MetricId, number>;
};

export type ExerciseHistory = {
  name: string;
  metrics: MetricId[];
  lastPerformedAt: number;
  points: ExerciseSessionPoint[];
};

export type BodyweightPoint = {
  sessionKey: string;
  performedAt: number;
  weightKg: number;
};

/** Epley estimate; a single rep is the lift itself. */
function estimateOneRepMaxKg(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) {
    return 0;
  }

  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

export function buildExerciseHistories(workouts: Workout[]): ExerciseHistory[] {
  const byExercise = new Map<string, ExerciseSessionPoint[]>();
  const loadKinds = new Map<string, { positive: boolean; negative: boolean }>();

  workouts.forEach((workout) => {
    workout.sessions.forEach((session) => {
      const grouped = new Map<string, typeof session.sets>();

      session.sets.forEach((setEntry) => {
        if (setEntry.reps <= 0) {
          return;
        }

        const sets = grouped.get(setEntry.exerciseName);
        if (sets) {
          sets.push(setEntry);
        } else {
          grouped.set(setEntry.exerciseName, [setEntry]);
        }
      });

      grouped.forEach((sets, exerciseName) => {
        let bestSet = sets[0];
        let e1rmKg = 0;
        let topSetKg = sets[0].weightKg;
        let volumeKg = 0;
        let totalReps = 0;

        sets.forEach((setEntry) => {
          const estimate = estimateOneRepMaxKg(setEntry.weightKg, setEntry.reps);
          const isBetter =
            estimate > e1rmKg ||
            (estimate === e1rmKg &&
              (setEntry.weightKg > bestSet.weightKg ||
                (setEntry.weightKg === bestSet.weightKg && setEntry.reps > bestSet.reps)));

          if (isBetter) {
            bestSet = setEntry;
          }

          e1rmKg = Math.max(e1rmKg, estimate);
          topSetKg = Math.max(topSetKg, setEntry.weightKg);
          volumeKg += Math.max(setEntry.weightKg, 0) * setEntry.reps;
          totalReps += setEntry.reps;
        });

        const kinds = loadKinds.get(exerciseName) ?? { positive: false, negative: false };
        kinds.positive ||= sets.some((setEntry) => setEntry.weightKg > 0);
        kinds.negative ||= sets.some((setEntry) => setEntry.weightKg < 0);
        loadKinds.set(exerciseName, kinds);

        const point: ExerciseSessionPoint = {
          sessionKey: session.id,
          performedAt: session.performedAt,
          workoutName: workout.name,
          setCount: sets.length,
          bestSet: { weightKg: bestSet.weightKg, reps: bestSet.reps },
          values: { e1rm: e1rmKg, top: topSetKg, volume: volumeKg, reps: totalReps },
        };

        const series = byExercise.get(exerciseName);
        if (series) {
          series.push(point);
        } else {
          byExercise.set(exerciseName, [point]);
        }
      });
    });
  });

  const histories: ExerciseHistory[] = [];
  byExercise.forEach((points, name) => {
    points.sort((a, b) => a.performedAt - b.performedAt);
    const kinds = loadKinds.get(name);

    // Assisted lifts log negative weight, so their progress is the top set
    // creeping toward zero; plain bodyweight lifts only progress in reps.
    const metrics: MetricId[] = kinds?.positive
      ? ['e1rm', 'top', 'volume', 'reps']
      : kinds?.negative
        ? ['top', 'reps']
        : ['reps'];

    histories.push({
      name,
      metrics,
      lastPerformedAt: points[points.length - 1].performedAt,
      points,
    });
  });

  return histories.sort((a, b) => b.lastPerformedAt - a.lastPerformedAt);
}

export function buildBodyweightSeries(workouts: Workout[]): BodyweightPoint[] {
  const points: BodyweightPoint[] = [];

  workouts.forEach((workout) => {
    workout.sessions.forEach((session) => {
      if (session.bodyweightKg !== null && session.bodyweightKg > 0) {
        points.push({
          sessionKey: session.id,
          performedAt: session.performedAt,
          weightKg: session.bodyweightKg,
        });
      }
    });
  });

  return points.sort((a, b) => a.performedAt - b.performedAt);
}

export function getRangeStart(range: RangeId, now: number): number {
  const days = RANGE_OPTIONS.find((option) => option.id === range)?.days ?? null;
  return days === null ? Number.NEGATIVE_INFINITY : now - days * 24 * 60 * 60 * 1000;
}

/**
 * Flags points that beat every earlier session. Computed over the full
 * history so a range filter can never turn an ordinary session into a "PR".
 */
export function getPrFlags(values: number[]): boolean[] {
  let best = Number.NEGATIVE_INFINITY;

  return values.map((value, index) => {
    const isPr = index > 0 && value > best;
    best = Math.max(best, value);
    return isPr;
  });
}

export type MetricSeries = {
  points: ExerciseSessionPoint[];
  values: number[];
  prFlags: boolean[];
  allTimeBest: number;
};

/** Metric values in display units, limited to the range. */
export function getMetricSeries(
  history: ExerciseHistory,
  metric: MetricId,
  rangeStart: number,
  unit: WeightUnit
): MetricSeries {
  const allValues = history.points.map((point) => toDisplayValue(point.values[metric], metric, unit));
  const allFlags = getPrFlags(allValues);
  const points: ExerciseSessionPoint[] = [];
  const values: number[] = [];
  const prFlags: boolean[] = [];

  history.points.forEach((point, index) => {
    if (point.performedAt >= rangeStart) {
      points.push(point);
      values.push(allValues[index]);
      prFlags.push(allFlags[index]);
    }
  });

  return { points, values, prFlags, allTimeBest: Math.max(...allValues) };
}

export function toDisplayValue(value: number, metric: MetricId, unit: WeightUnit): number {
  return metric === 'reps' ? value : convertKgToUnit(value, unit);
}

function formatCompact(value: number): string {
  const magnitude = Math.abs(value);

  if (magnitude >= 1_000_000) {
    return `${Number((value / 1_000_000).toFixed(1))}M`;
  }

  if (magnitude >= 10_000) {
    return `${Number((value / 1000).toFixed(1))}k`;
  }

  return Math.round(value).toLocaleString();
}

function formatDisplayWeight(value: number): string {
  return Math.abs(value) >= 100 ? value.toFixed(0) : String(Number(value.toFixed(1)));
}

/** Axis tick label: number only, the unit lives in the readout. */
export function formatMetricTick(value: number, metric: MetricId): string {
  if (metric === 'volume') {
    return formatCompact(value);
  }

  if (metric === 'reps') {
    return String(Math.round(value));
  }

  return formatDisplayWeight(value);
}

export function formatMetricValue(value: number, metric: MetricId, unit: WeightUnit): string {
  if (metric === 'reps') {
    return `${Math.round(value)} reps`;
  }

  if (metric === 'volume') {
    return `${formatCompact(value)} ${unit}`;
  }

  return `${formatDisplayWeight(value)} ${unit}`;
}

export function formatMetricDelta(delta: number, metric: MetricId, unit: WeightUnit): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return `${sign}${formatMetricValue(Math.abs(delta), metric, unit)}`;
}

export function formatBestSet(bestSet: { weightKg: number; reps: number }, unit: WeightUnit): string {
  if (bestSet.weightKg === 0) {
    return `${bestSet.reps} reps`;
  }

  return `${formatWeightFromKg(bestSet.weightKg, unit)} × ${bestSet.reps}`;
}
