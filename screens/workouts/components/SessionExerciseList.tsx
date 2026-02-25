import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import Animated, { Easing, LinearTransition } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { designTokens } from '@/constants/design-system';
import { formatWeightFromKg, isAssistedWeightKg } from '@/lib/weight';

import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import { formatDuration } from '../utils';
import { styles } from './SessionExerciseList.styles';

const { opacity } = designTokens;
const exerciseCardLayoutTransition = LinearTransition
  .duration(220)
  .easing(Easing.bezier(0.2, 0, 0, 1));

export function SessionExerciseList({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  const { activeSession, theme, settings } = controller;

  if (!activeSession) {
    return null;
  }

  return (
    <>
      {controller.groupedActiveSets.map((group, groupIndex) => {
        const groupIsAssisted = isAssistedWeightKg(group.targetWeightKg);
        const completedSetCount = group.sets.filter((setEntry) => setEntry.actualReps > 0).length;
        const groupCompleted = group.sets.length > 0 && completedSetCount === group.sets.length;
        const isCurrentGroup = !groupCompleted && groupIndex === 0;

        return (
          <Animated.View
            key={group.exerciseName}
            layout={exerciseCardLayoutTransition}
            style={[
              styles.exerciseCard,
              {
                borderColor: groupCompleted
                  ? theme.palette.success
                  : isCurrentGroup
                    ? theme.palette.accent
                    : theme.palette.border,
                backgroundColor: theme.palette.panel,
                opacity: groupCompleted ? 0.82 : 1,
              },
            ]}
          >
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseTitleRow}>
                <View style={styles.exerciseNameRow}>
                  <AppText variant="heading">{group.exerciseName}</AppText>
                  {groupIsAssisted ? (
                    <Ionicons
                      name="arrow-down-circle"
                      size={16}
                      color={theme.palette.accentSecondary}
                    />
                  ) : null}
                </View>

                {groupCompleted ? (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        borderColor: `${theme.palette.success}66`,
                        backgroundColor: `${theme.palette.success}1a`,
                      },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={14} color={theme.palette.success} />
                    <AppText variant="micro" tone="success">
                      Completed
                    </AppText>
                  </View>
                ) : isCurrentGroup ? (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        borderColor: `${theme.palette.accent}66`,
                        backgroundColor: `${theme.palette.accent}18`,
                      },
                    ]}
                  >
                    <Ionicons name="play" size={12} color={theme.palette.accent} />
                    <AppText variant="micro" tone="accent">
                      Current
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText variant="micro" tone="muted">
                Target {formatWeightFromKg(Math.abs(group.targetWeightKg), settings.weightUnit)}
                {groupIsAssisted ? ' assisted' : ''} {' • '}Rest {formatDuration(group.restSeconds * 1000)}
              </AppText>
            </View>

            <View style={styles.setBoxGrid}>
              {group.sets.map((setEntry) => {
                const completed = setEntry.actualReps > 0;
                const setWeight = formatWeightFromKg(Math.abs(setEntry.actualWeightKg), settings.weightUnit);
                const setIsAssisted = isAssistedWeightKg(setEntry.actualWeightKg);

                return (
                  <View
                    key={setEntry.id}
                    style={[
                      styles.setBox,
                      {
                        borderColor: completed ? theme.palette.accent : theme.palette.border,
                        backgroundColor: completed
                          ? `${theme.palette.accent}22`
                          : theme.palette.panelSoft,
                      },
                    ]}
                  >
                    <Pressable
                      delayLongPress={260}
                      onPressIn={() => {
                        controller.setBoxLongPressRef.current = false;
                      }}
                      onLongPress={() => {
                        controller.setBoxLongPressRef.current = true;
                        controller.handleSetLongPress(setEntry);
                      }}
                      onPress={() => {
                        if (controller.setBoxLongPressRef.current) {
                          controller.setBoxLongPressRef.current = false;
                          return;
                        }

                        void controller.handleSetPress(setEntry);
                      }}
                      style={({ pressed }) => [
                        styles.setBoxMain,
                        { opacity: pressed ? opacity.pressedSoft : 1 },
                      ]}
                    >
                      <AppText variant="micro" tone="muted">
                        Set {setEntry.setNumber}
                      </AppText>
                      <AppText variant="heading" tone={completed ? 'accent' : 'primary'}>
                        {completed ? setEntry.actualReps : '--'}
                      </AppText>
                      <AppText variant="micro" tone="muted">
                        / {setEntry.targetReps}
                      </AppText>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        controller.handleSetWeightPress(setEntry);
                      }}
                      style={({ pressed }) => [
                        styles.setBoxWeightBar,
                        {
                          borderTopColor: completed
                            ? `${theme.palette.accentContrast}33`
                            : theme.palette.border,
                          backgroundColor: completed
                            ? theme.palette.accent
                            : `${theme.palette.background}4a`,
                          opacity: pressed ? opacity.pressedSoft : 1,
                        },
                      ]}
                    >
                      <AppText variant="micro" tone={completed ? 'inverse' : 'muted'}>
                        {setWeight}
                        {setIsAssisted ? ' assisted' : ''}
                      </AppText>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        );
      })}
    </>
  );
}
