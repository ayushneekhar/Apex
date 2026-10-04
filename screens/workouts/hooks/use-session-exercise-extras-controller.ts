import { useMemo, useState } from "react";

import { EXERCISE_LIBRARY } from "@/constants/exercise-library";
import { triggerLightImpactHaptic, triggerLongPressHaptic } from "@/lib/haptics";
import { parseWeightInputToKg, type WeightUnit } from "@/lib/weight";
import type { ActiveWorkoutSession, ActiveWorkoutSet, Workout } from "@/types/workout";

type SessionExerciseExtrasDeps = {
  activeSession: ActiveWorkoutSession | null;
  workouts: Workout[];
  weightUnit: WeightUnit;
  setSessionActionError: (value: string | null) => void;
  addActiveSessionExercise: (input: {
    name: string;
    sets: number;
    reps: number;
    weightKg: number | null;
  }) => Promise<void>;
  addWarmupSet: (workoutExerciseId: string, unit: WeightUnit) => Promise<void>;
  removeWarmupSet: (setId: string) => Promise<void>;
  setActiveSessionExerciseNote: (workoutExerciseId: string, note: string) => Promise<void>;
};

const DEFAULT_NEW_EXERCISE_SETS = "3";
const DEFAULT_NEW_EXERCISE_REPS = "10";

function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase();
}

/** Warm-ups, per-exercise notes, and adding exercises mid-session. */
export function useSessionExerciseExtrasController({
  activeSession,
  workouts,
  weightUnit,
  setSessionActionError,
  addActiveSessionExercise,
  addWarmupSet,
  removeWarmupSet,
  setActiveSessionExerciseNote,
}: SessionExerciseExtrasDeps) {
  const [noteEditorExerciseId, setNoteEditorExerciseId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");

  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false);
  const [addExerciseNameInput, setAddExerciseNameInput] = useState("");
  const [addExerciseSetsInput, setAddExerciseSetsInput] = useState(DEFAULT_NEW_EXERCISE_SETS);
  const [addExerciseRepsInput, setAddExerciseRepsInput] = useState(DEFAULT_NEW_EXERCISE_REPS);
  const [addExerciseWeightInput, setAddExerciseWeightInput] = useState("");
  const [addExerciseError, setAddExerciseError] = useState<string | null>(null);

  /** Latest note per exercise name across every past session, to remind you next time. */
  const previousNotesByName = useMemo(() => {
    const latest = new Map<string, { note: string; performedAt: number }>();

    workouts.forEach((workout) => {
      workout.sessions.forEach((session) => {
        session.exerciseNotes.forEach((entry) => {
          const key = normalizeExerciseName(entry.exerciseName);
          const existing = latest.get(key);

          if (!existing || session.performedAt > existing.performedAt) {
            latest.set(key, { note: entry.note, performedAt: session.performedAt });
          }
        });
      });
    });

    return new Map(Array.from(latest, ([key, value]) => [key, value.note]));
  }, [workouts]);

  const addExerciseFilteredLibrary = useMemo(() => {
    const query = normalizeExerciseName(addExerciseNameInput);

    return query
      ? EXERCISE_LIBRARY.filter((exerciseName) => exerciseName.toLowerCase().includes(query))
      : EXERCISE_LIBRARY;
  }, [addExerciseNameInput]);

  const noteEditorExerciseName = useMemo(
    () =>
      activeSession?.sets.find((setEntry) => setEntry.workoutExerciseId === noteEditorExerciseId)
        ?.exerciseName ?? "",
    [activeSession?.sets, noteEditorExerciseId]
  );

  function getExerciseNote(workoutExerciseId: string): string | null {
    return activeSession?.exerciseNotes[workoutExerciseId] ?? null;
  }

  function getPreviousExerciseNote(exerciseName: string): string | null {
    return previousNotesByName.get(normalizeExerciseName(exerciseName)) ?? null;
  }

  async function handleAddWarmup(workoutExerciseId: string) {
    triggerLightImpactHaptic();

    try {
      await addWarmupSet(workoutExerciseId, weightUnit);
      setSessionActionError(null);
    } catch {
      setSessionActionError("Could not add a warm-up set.");
    }
  }

  async function handleRemoveWarmup(setEntry: ActiveWorkoutSet) {
    triggerLongPressHaptic();

    try {
      await removeWarmupSet(setEntry.id);
      setSessionActionError(null);
    } catch {
      setSessionActionError("Could not remove that warm-up set.");
    }
  }

  function openNoteEditor(workoutExerciseId: string) {
    setNoteEditorExerciseId(workoutExerciseId);
    setNoteInput(activeSession?.exerciseNotes[workoutExerciseId] ?? "");
  }

  function closeNoteEditor() {
    setNoteEditorExerciseId(null);
    setNoteInput("");
  }

  async function saveNote() {
    if (!noteEditorExerciseId) {
      return;
    }

    try {
      await setActiveSessionExerciseNote(noteEditorExerciseId, noteInput);
      closeNoteEditor();
    } catch {
      setSessionActionError("Could not save the note.");
      closeNoteEditor();
    }
  }

  function openAddExercise() {
    setAddExerciseNameInput("");
    setAddExerciseSetsInput(DEFAULT_NEW_EXERCISE_SETS);
    setAddExerciseRepsInput(DEFAULT_NEW_EXERCISE_REPS);
    setAddExerciseWeightInput("");
    setAddExerciseError(null);
    setIsAddExerciseOpen(true);
  }

  function closeAddExercise() {
    setIsAddExerciseOpen(false);
    setAddExerciseError(null);
  }

  function clearAddExerciseError() {
    setAddExerciseError((current) => (current ? null : current));
  }

  async function saveAddExercise() {
    const name = addExerciseNameInput.trim();
    const sets = Number.parseInt(addExerciseSetsInput.trim(), 10);
    const reps = Number.parseInt(addExerciseRepsInput.trim(), 10);
    const weightText = addExerciseWeightInput.trim();
    const weightKg = weightText ? parseWeightInputToKg(weightText, weightUnit) : null;

    if (!name) {
      setAddExerciseError("Pick or type an exercise.");
      return;
    }

    if (!Number.isFinite(sets) || sets < 1) {
      setAddExerciseError("Sets must be 1 or greater.");
      return;
    }

    if (!Number.isFinite(reps) || reps < 1) {
      setAddExerciseError("Reps must be 1 or greater.");
      return;
    }

    if (weightText && weightKg === null) {
      setAddExerciseError("Weight is invalid. Use a valid number.");
      return;
    }

    try {
      await addActiveSessionExercise({ name, sets, reps, weightKg });
      closeAddExercise();
    } catch (error) {
      setAddExerciseError(
        error instanceof Error && error.message ? error.message : "Could not add the exercise."
      );
    }
  }

  return {
    handleAddWarmup,
    handleRemoveWarmup,

    getExerciseNote,
    getPreviousExerciseNote,
    noteEditorExerciseId,
    noteEditorExerciseName,
    noteInput,
    setNoteInput,
    openNoteEditor,
    closeNoteEditor,
    saveNote,

    isAddExerciseOpen,
    addExerciseNameInput,
    setAddExerciseNameInput,
    addExerciseSetsInput,
    setAddExerciseSetsInput,
    addExerciseRepsInput,
    setAddExerciseRepsInput,
    addExerciseWeightInput,
    setAddExerciseWeightInput,
    addExerciseError,
    clearAddExerciseError,
    addExerciseFilteredLibrary,
    openAddExercise,
    closeAddExercise,
    saveAddExercise,
  };
}
