const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type WeekRuns = {
  /** Week start timestamp → index of the run of consecutive trained weeks it belongs to. */
  runByWeek: Map<number, number>;
  runLengths: number[];
  activeRunId: number | null;
};

export function getWeekStartTimestamp(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay()).getTime();
}

/**
 * Groups trained weeks (Sun–Sat) into runs of consecutive weeks. The active run
 * is the one containing this week, or last week — an empty current week doesn't
 * break the streak until it's over.
 */
export function getWeekRuns(performedAts: number[], now: number): WeekRuns {
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

export function getActiveWeekStreak(weekRuns: WeekRuns): number {
  return weekRuns.activeRunId === null ? 0 : weekRuns.runLengths[weekRuns.activeRunId];
}

/** Week start timestamps for the `count` weeks ending with the week containing `now`, oldest first. */
export function getRecentWeekStarts(now: number, count: number): number[] {
  const thisWeek = getWeekStartTimestamp(now);

  return Array.from({ length: count }, (_, index) =>
    // Anchor on mid-week days so DST shifts land in the right week.
    getWeekStartTimestamp(thisWeek + 3 * MS_PER_DAY - (count - 1 - index) * 7 * MS_PER_DAY)
  );
}
