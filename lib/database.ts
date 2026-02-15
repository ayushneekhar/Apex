import { Directory, File } from 'expo-file-system';
import {
  backupDatabaseAsync,
  deserializeDatabaseAsync,
  openDatabaseAsync,
  type SQLiteDatabase,
} from 'expo-sqlite';

import { DEFAULT_REST_SECONDS } from '@/constants/workout';
import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from '@/constants/app-themes';
import { createId } from '@/lib/id';
import { DEFAULT_WEIGHT_UNIT, isWeightUnit, type WeightUnit } from '@/lib/weight';
import type {
  ActiveWorkoutSession,
  AppSettings,
  NewWorkoutInput,
  NewWorkoutSessionInput,
  UpdateWorkoutInput,
  UpdateWorkoutSessionInput,
  Workout,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSessionSet,
} from '@/types/workout';

const DB_NAME = 'apex.db';

type SettingKey = 'theme_id' | 'weight_unit';

type SettingRow = {
  key: SettingKey;
  value: string;
};

type WorkoutRow = {
  id: string;
  name: string;
  created_at: number;
  weeks_completed: number;
};

type WorkoutExerciseRow = {
  id: string;
  workout_id: string;
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  start_weight_kg: number;
  overload_increment_kg: number;
  sort_order: number;
};

type WorkoutSessionRow = {
  id: string;
  workout_id: string;
  performed_at: number;
  bodyweight_kg: number | null;
};

type WorkoutSessionSetRow = {
  id: string;
  session_id: string;
  workout_exercise_id: string;
  exercise_name: string;
  set_number: number;
  reps: number;
  weight_kg: number;
};

type ActiveWorkoutSessionRow = {
  payload: string;
};

let databasePromise: Promise<SQLiteDatabase> | null = null;

export const DEFAULT_SETTINGS: AppSettings = {
  themeId: DEFAULT_THEME_ID,
  weightUnit: DEFAULT_WEIGHT_UNIT,
};

async function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DB_NAME);
  }

  return databasePromise;
}

function isUserCancellationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /cancel/i.test(error.message);
}

export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      weeks_completed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY NOT NULL,
      workout_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sets INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      rest_seconds INTEGER NOT NULL DEFAULT 90,
      start_weight_kg REAL NOT NULL,
      overload_increment_kg REAL NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      workout_id TEXT NOT NULL,
      performed_at INTEGER NOT NULL,
      bodyweight_kg REAL,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workout_session_sets (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      workout_exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS active_workout_session (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id
      ON workout_exercises(workout_id);

    CREATE INDEX IF NOT EXISTS idx_workout_sessions_workout_id_performed_at
      ON workout_sessions(workout_id, performed_at DESC);

    CREATE INDEX IF NOT EXISTS idx_workout_session_sets_session_id_set_number
      ON workout_session_sets(session_id, set_number ASC);
  `);

  const sessionTableColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(workout_sessions);');
  const hasBodyweightColumn = sessionTableColumns.some((column) => column.name === 'bodyweight_kg');

  if (!hasBodyweightColumn) {
    await db.execAsync('ALTER TABLE workout_sessions ADD COLUMN bodyweight_kg REAL;');
  }

  const exerciseTableColumns = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(workout_exercises);'
  );
  const hasRestSecondsColumn = exerciseTableColumns.some((column) => column.name === 'rest_seconds');

  if (!hasRestSecondsColumn) {
    await db.execAsync(
      `ALTER TABLE workout_exercises ADD COLUMN rest_seconds INTEGER NOT NULL DEFAULT ${DEFAULT_REST_SECONDS};`
    );
  }
}

function normalizeActiveWorkoutSession(value: unknown): ActiveWorkoutSession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const session = value as Partial<ActiveWorkoutSession>;
  const normalizedBodyweight =
    session.bodyweightKg === undefined || session.bodyweightKg === null ? null : session.bodyweightKg;

  if (
    typeof session.workoutId !== 'string' ||
    typeof session.workoutName !== 'string' ||
    typeof session.startedAt !== 'number' ||
    (typeof normalizedBodyweight !== 'number' && normalizedBodyweight !== null) ||
    typeof session.totalPausedMs !== 'number' ||
    (session.pauseStartedAt !== null && typeof session.pauseStartedAt !== 'number') ||
    typeof session.isPaused !== 'boolean' ||
    typeof session.restoredFromAppClose !== 'boolean' ||
    !Array.isArray(session.sets)
  ) {
    return null;
  }

  const setsAreValid = session.sets.every((set) => {
    if (!set || typeof set !== 'object') {
      return false;
    }

    const activeSet = set as ActiveWorkoutSession['sets'][number];
    const normalizedRestSeconds =
      typeof activeSet.restSeconds === 'number' && activeSet.restSeconds > 0
        ? Math.floor(activeSet.restSeconds)
        : DEFAULT_REST_SECONDS;
    const normalizedActualWeightKg =
      typeof activeSet.actualWeightKg === 'number' && Number.isFinite(activeSet.actualWeightKg)
        ? activeSet.actualWeightKg
        : activeSet.targetWeightKg;

    return (
      typeof activeSet.id === 'string' &&
      typeof activeSet.workoutExerciseId === 'string' &&
      typeof activeSet.exerciseName === 'string' &&
      typeof activeSet.setNumber === 'number' &&
      typeof activeSet.targetReps === 'number' &&
      typeof activeSet.targetWeightKg === 'number' &&
      typeof normalizedActualWeightKg === 'number' &&
      Number.isFinite(normalizedActualWeightKg) &&
      typeof normalizedRestSeconds === 'number' &&
      typeof activeSet.actualReps === 'number'
    );
  });

  if (!setsAreValid) {
    return null;
  }

  return {
    workoutId: session.workoutId,
    workoutName: session.workoutName,
    startedAt: session.startedAt,
    bodyweightKg: normalizedBodyweight,
    totalPausedMs: session.totalPausedMs,
    pauseStartedAt: session.pauseStartedAt,
    isPaused: session.isPaused,
    restoredFromAppClose: session.restoredFromAppClose,
    sets: session.sets.map((set) => ({
      ...set,
      actualWeightKg:
        typeof set.actualWeightKg === 'number' && Number.isFinite(set.actualWeightKg)
          ? set.actualWeightKg
          : set.targetWeightKg,
      restSeconds:
        typeof set.restSeconds === 'number' && set.restSeconds > 0
          ? Math.floor(set.restSeconds)
          : DEFAULT_REST_SECONDS,
    })),
  };
}

export async function loadActiveWorkoutSession(): Promise<ActiveWorkoutSession | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ActiveWorkoutSessionRow>(
    'SELECT payload FROM active_workout_session WHERE id = 1;'
  );

  if (!row) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(row.payload);
    return normalizeActiveWorkoutSession(parsed);
  } catch {
    return null;
  }
}

export async function saveActiveWorkoutSession(session: ActiveWorkoutSession): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO active_workout_session (id, payload, updated_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload,
        updated_at = excluded.updated_at;
    `,
    JSON.stringify(session),
    Date.now()
  );
}

export async function clearActiveWorkoutSession(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM active_workout_session WHERE id = 1;');
}

export async function loadSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SettingRow>(
    'SELECT key, value FROM app_settings WHERE key IN (?, ?);',
    'theme_id',
    'weight_unit'
  );

  let themeId: ThemeId = DEFAULT_THEME_ID;
  let weightUnit: WeightUnit = DEFAULT_WEIGHT_UNIT;

  rows.forEach((row) => {
    if (row.key === 'theme_id' && isThemeId(row.value)) {
      themeId = row.value;
      return;
    }

    if (row.key === 'weight_unit' && isWeightUnit(row.value)) {
      weightUnit = row.value;
    }
  });

  return {
    themeId,
    weightUnit,
  };
}

async function saveSetting(key: SettingKey, value: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `,
    key,
    value
  );
}

export async function saveThemeSetting(themeId: ThemeId): Promise<void> {
  await saveSetting('theme_id', themeId);
}

export async function saveWeightUnitSetting(unit: WeightUnit): Promise<void> {
  await saveSetting('weight_unit', unit);
}

export async function listWorkouts(): Promise<Workout[]> {
  const db = await getDatabase();

  const [workoutRows, exerciseRows, sessionRows, sessionSetRows] = await Promise.all([
    db.getAllAsync<WorkoutRow>(
      'SELECT id, name, created_at, weeks_completed FROM workouts ORDER BY created_at DESC;'
    ),
    db.getAllAsync<WorkoutExerciseRow>(
      `
        SELECT
          id,
          workout_id,
          name,
          sets,
          reps,
          rest_seconds,
          start_weight_kg,
          overload_increment_kg,
          sort_order
        FROM workout_exercises
        ORDER BY sort_order ASC;
      `
    ),
    db.getAllAsync<WorkoutSessionRow>(
      `
        SELECT
          id,
          workout_id,
          performed_at,
          bodyweight_kg
        FROM workout_sessions
        ORDER BY performed_at DESC;
      `
    ),
    db.getAllAsync<WorkoutSessionSetRow>(
      `
        SELECT
          id,
          session_id,
          workout_exercise_id,
          exercise_name,
          set_number,
          reps,
          weight_kg
        FROM workout_session_sets
        ORDER BY set_number ASC;
      `
    ),
  ]);

  const exerciseMap = new Map<string, WorkoutExercise[]>();

  exerciseRows.forEach((row) => {
    const mapped: WorkoutExercise = {
      id: row.id,
      name: row.name,
      sets: row.sets,
      reps: row.reps,
      restSeconds:
        Number.isFinite(row.rest_seconds) && row.rest_seconds > 0
          ? Math.floor(row.rest_seconds)
          : DEFAULT_REST_SECONDS,
      startWeightKg: row.start_weight_kg,
      overloadIncrementKg: row.overload_increment_kg,
      sortOrder: row.sort_order,
    };

    const existing = exerciseMap.get(row.workout_id);
    if (existing) {
      existing.push(mapped);
      return;
    }

    exerciseMap.set(row.workout_id, [mapped]);
  });

  const sessionSetMap = new Map<string, WorkoutSessionSet[]>();

  sessionSetRows.forEach((row) => {
    const mapped: WorkoutSessionSet = {
      id: row.id,
      workoutExerciseId: row.workout_exercise_id,
      exerciseName: row.exercise_name,
      setNumber: row.set_number,
      reps: row.reps,
      weightKg: row.weight_kg,
    };

    const existing = sessionSetMap.get(row.session_id);
    if (existing) {
      existing.push(mapped);
      return;
    }

    sessionSetMap.set(row.session_id, [mapped]);
  });

  const sessionMap = new Map<string, WorkoutSession[]>();

  sessionRows.forEach((row) => {
    const mapped: WorkoutSession = {
      id: row.id,
      workoutId: row.workout_id,
      performedAt: row.performed_at,
      bodyweightKg: row.bodyweight_kg,
      sets: sessionSetMap.get(row.id) ?? [],
    };

    const existing = sessionMap.get(row.workout_id);
    if (existing) {
      existing.push(mapped);
      return;
    }

    sessionMap.set(row.workout_id, [mapped]);
  });

  return workoutRows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    weeksCompleted: row.weeks_completed,
    exercises: exerciseMap.get(row.id) ?? [],
    sessions: sessionMap.get(row.id) ?? [],
  }));
}

export async function createWorkout(input: NewWorkoutInput): Promise<void> {
  const db = await getDatabase();
  const workoutId = createId('workout');
  const createdAt = Date.now();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        INSERT INTO workouts (id, name, created_at, weeks_completed)
        VALUES (?, ?, ?, ?);
      `,
      workoutId,
      input.name.trim(),
      createdAt,
      0
    );

    for (const [index, exercise] of input.exercises.entries()) {
      await db.runAsync(
        `
          INSERT INTO workout_exercises (
            id,
            workout_id,
            name,
            sets,
            reps,
            rest_seconds,
            start_weight_kg,
            overload_increment_kg,
            sort_order
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        createId('exercise'),
        workoutId,
        exercise.name.trim(),
        exercise.sets,
        exercise.reps,
        exercise.restSeconds,
        exercise.startWeightKg,
        exercise.overloadIncrementKg,
        index
      );
    }
  });
}

export async function createWorkoutSession(input: NewWorkoutSessionInput): Promise<void> {
  const db = await getDatabase();
  const sessionId = createId('session');

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
      INSERT INTO workout_sessions (id, workout_id, performed_at, bodyweight_kg)
      VALUES (?, ?, ?, ?);
      `,
      sessionId,
      input.workoutId,
      input.performedAt ?? Date.now(),
      input.bodyweightKg ?? null
    );

    for (const set of input.sets) {
      await db.runAsync(
        `
          INSERT INTO workout_session_sets (
            id,
            session_id,
            workout_exercise_id,
            exercise_name,
            set_number,
            reps,
            weight_kg
          )
          VALUES (?, ?, ?, ?, ?, ?, ?);
        `,
        createId('session_set'),
        sessionId,
        set.workoutExerciseId,
        set.exerciseName,
        set.setNumber,
        set.reps,
        set.weightKg
      );
    }
  });
}

export async function updateWorkout(input: UpdateWorkoutInput): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        UPDATE workouts
        SET name = ?
        WHERE id = ?;
      `,
      input.name.trim(),
      input.id
    );

    await db.runAsync('DELETE FROM workout_exercises WHERE workout_id = ?;', input.id);

    for (const [index, exercise] of input.exercises.entries()) {
      await db.runAsync(
        `
          INSERT INTO workout_exercises (
            id,
            workout_id,
            name,
            sets,
            reps,
            rest_seconds,
            start_weight_kg,
            overload_increment_kg,
            sort_order
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        createId('exercise'),
        input.id,
        exercise.name.trim(),
        exercise.sets,
        exercise.reps,
        exercise.restSeconds,
        exercise.startWeightKg,
        exercise.overloadIncrementKg,
        index
      );
    }
  });
}

export async function updateWorkoutSession(input: UpdateWorkoutSessionInput): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `
        UPDATE workout_sessions
        SET workout_id = ?, performed_at = ?, bodyweight_kg = ?
        WHERE id = ?;
      `,
      input.workoutId,
      input.performedAt,
      input.bodyweightKg ?? null,
      input.sessionId
    );

    await db.runAsync('DELETE FROM workout_session_sets WHERE session_id = ?;', input.sessionId);

    for (const set of input.sets) {
      await db.runAsync(
        `
          INSERT INTO workout_session_sets (
            id,
            session_id,
            workout_exercise_id,
            exercise_name,
            set_number,
            reps,
            weight_kg
          )
          VALUES (?, ?, ?, ?, ?, ?, ?);
        `,
        createId('session_set'),
        input.sessionId,
        set.workoutExerciseId,
        set.exerciseName,
        set.setNumber,
        set.reps,
        set.weightKg
      );
    }
  });
}

export async function advanceWorkoutWeek(workoutId: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `
      UPDATE workouts
      SET weeks_completed = weeks_completed + 1
      WHERE id = ?;
    `,
    workoutId
  );
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM workouts WHERE id = ?;', workoutId);
}

export async function exportDatabaseBackup(): Promise<string | null> {
  try {
    const db = await getDatabase();
    const serialized = await db.serializeAsync();
    const destinationDirectory = await Directory.pickDirectoryAsync();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = new File(destinationDirectory.uri, `apex-backup-${timestamp}.db`);
    backupFile.create({ overwrite: true });
    backupFile.write(serialized);

    return backupFile.uri;
  } catch (error) {
    if (isUserCancellationError(error)) {
      return null;
    }

    throw error;
  }
}

type SqliteTableRow = {
  name: string;
};

async function assertValidBackupDatabase(db: SQLiteDatabase): Promise<void> {
  const tableRows = await db.getAllAsync<SqliteTableRow>(
    "SELECT name FROM sqlite_master WHERE type = 'table';"
  );
  const tableNames = new Set(tableRows.map((row) => row.name));
  const requiredTables = [
    'workouts',
    'workout_exercises',
    'workout_sessions',
    'workout_session_sets',
  ];

  if (requiredTables.some((tableName) => !tableNames.has(tableName))) {
    throw new Error('Selected file is not a valid Apex backup.');
  }
}

export async function importDatabaseBackup(): Promise<boolean> {
  let sourceDatabase: SQLiteDatabase | null = null;

  try {
    const picked = await File.pickFileAsync();
    const pickedFile = Array.isArray(picked) ? picked[0] : picked;

    if (!pickedFile) {
      return false;
    }

    const bytes = await pickedFile.bytes();
    if (bytes.length === 0) {
      throw new Error('Selected backup file is empty.');
    }

    sourceDatabase = await deserializeDatabaseAsync(bytes);
    await assertValidBackupDatabase(sourceDatabase);

    const destinationDatabase = await getDatabase();
    await backupDatabaseAsync({
      sourceDatabase,
      destDatabase: destinationDatabase,
    });

    return true;
  } catch (error) {
    if (isUserCancellationError(error)) {
      return false;
    }

    throw error;
  } finally {
    if (sourceDatabase) {
      await sourceDatabase.closeAsync();
    }
  }
}
