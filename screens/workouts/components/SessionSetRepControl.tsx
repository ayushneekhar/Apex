import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { AppTheme } from '@/constants/app-themes';
import { designTokens } from '@/constants/design-system';
import { triggerMediumImpactHaptic, triggerSelectionHaptic } from '@/lib/haptics';
import type { ActiveWorkoutSet } from '@/types/workout';

import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import { SetRepMeter } from './SetRepMeter';
import { styles } from './SessionExerciseList.styles';

const { opacity } = designTokens;

const HOLD_TO_SCRUB_MS = 260;
const PX_PER_REP = 18;
const MAX_REPS_ABOVE_TARGET = 15;

/**
 * Top section of a set box. Tap completes the set or removes a rep. Press and
 * hold, then drag up/down to scrub reps (committed on release). Press and hold
 * without dragging opens the reps editor.
 */
export function SessionSetRepControl({
  controller,
  theme,
  setEntry,
}: {
  controller: WorkoutsScreenController;
  theme: AppTheme;
  setEntry: ActiveWorkoutSet;
}) {
  const [pressed, setPressed] = useState(false);
  const [previewReps, setPreviewReps] = useState<number | null>(null);
  const scrubRef = useRef({ active: false, stepped: false, baseReps: 0, reps: 0 });

  // Pending sets scrub relative to the target, since "a couple short of
  // target" is the usual adjustment.
  const baseReps = setEntry.actualReps > 0 ? setEntry.actualReps : setEntry.targetReps;
  const maxReps = Math.max(baseReps, setEntry.targetReps) + MAX_REPS_ABOVE_TARGET;

  const scrubGesture = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(HOLD_TO_SCRUB_MS)
    .shouldCancelWhenOutside(false)
    .onStart(() => {
      scrubRef.current = { active: true, stepped: false, baseReps, reps: baseReps };
      controller.handleSetRepScrubStart();
    })
    .onUpdate((event) => {
      const scrub = scrubRef.current;
      const steps = Math.round(-event.translationY / PX_PER_REP);
      if (!scrub.stepped && steps === 0) {
        return;
      }

      const nextReps = Math.min(maxReps, Math.max(0, scrub.baseReps + steps));

      if (scrub.stepped && nextReps === scrub.reps) {
        return;
      }

      scrub.stepped = true;
      scrub.reps = nextReps;
      setPreviewReps(nextReps);

      if (nextReps === setEntry.targetReps) {
        triggerMediumImpactHaptic();
      } else {
        triggerSelectionHaptic();
      }
    })
    .onFinalize((_event, success) => {
      const scrub = scrubRef.current;

      if (!scrub.active) {
        return;
      }

      scrubRef.current = { ...scrub, active: false };
      setPreviewReps(null);

      if (!success) {
        controller.handleSetRepScrubCancel();
        return;
      }

      if (!scrub.stepped) {
        controller.handleSetRepScrubCancel();
        controller.handleSetLongPress(setEntry);
        return;
      }

      void controller.handleSetRepScrubCommit(setEntry, scrub.reps);
    });

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .maxDistance(12)
    .onBegin(() => {
      setPressed(true);
    })
    .onEnd((_event, success) => {
      if (success) {
        void controller.handleSetPress(setEntry);
      }
    })
    .onFinalize(() => {
      setPressed(false);
    });

  const isScrubbing = previewReps !== null;

  return (
    <GestureDetector gesture={Gesture.Exclusive(scrubGesture, tapGesture)}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Set ${setEntry.setNumber}`}
        accessibilityValue={{
          text: setEntry.actualReps > 0
            ? `${setEntry.actualReps} of ${setEntry.targetReps} reps`
            : `Not done, target ${setEntry.targetReps} reps`,
        }}
        accessibilityActions={[
          { name: 'activate' },
          { name: 'increment' },
          { name: 'decrement' },
          { name: 'longpress', label: 'Edit reps' },
        ]}
        onAccessibilityAction={(event) => {
          switch (event.nativeEvent.actionName) {
            case 'activate':
              void controller.handleSetPress(setEntry);
              break;
            case 'increment':
              void controller.handleSetRepScrubCommit(
                setEntry,
                setEntry.actualReps > 0 ? Math.min(maxReps, setEntry.actualReps + 1) : setEntry.targetReps
              );
              break;
            case 'decrement':
              void controller.handleSetRepScrubCommit(setEntry, Math.max(0, setEntry.actualReps - 1));
              break;
            case 'longpress':
              controller.handleSetLongPress(setEntry);
              break;
          }
        }}
        style={[
          styles.setBoxMain,
          isScrubbing ? { backgroundColor: `${theme.palette.accent}14` } : null,
          { opacity: pressed && !isScrubbing ? opacity.pressedSoft : 1 },
        ]}
      >
        <SetRepMeter
          theme={theme}
          setNumber={setEntry.setNumber}
          actualReps={previewReps ?? setEntry.actualReps}
          targetReps={setEntry.targetReps}
          previousReps={setEntry.previousReps}
        />
      </View>
    </GestureDetector>
  );
}
