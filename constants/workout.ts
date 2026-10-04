export const DEFAULT_REST_SECONDS = 90;
export const MIN_REST_SECONDS = 15;
export const MAX_REST_SECONDS = 600;
export const REST_TIMER_STEP_SECONDS = 15;

/**
 * Hidden workout row that owns sessions started empty. It's stored archived so
 * it never counts as a template, and the template UIs filter it out by id.
 */
export const QUICK_WORKOUT_ID = 'workout_quick';
export const QUICK_WORKOUT_NAME = 'Quick Workout';

/** Warm-up ramp toward the working weight: share of working weight and reps per step. */
export const WARMUP_RAMP = [
  { share: 0.5, reps: 8 },
  { share: 0.7, reps: 5 },
  { share: 0.85, reps: 3 },
  { share: 0.9, reps: 2 },
] as const;
