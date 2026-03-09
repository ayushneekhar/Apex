import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import { designTokens } from '@/constants/design-system';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAppStore } from '@/store/use-app-store';
import type { RootStackParamList } from '@/types/navigation';

import { ErrorNotice } from './workouts/components/common/ErrorNotice';
import { WorkoutBuilderPanel } from './workouts/components/WorkoutBuilderPanel';
import { useWorkoutBuilderController } from './workouts/hooks/use-workout-builder-controller';
import { estimateWorkoutMinutes } from './workouts/utils';
import { styles } from './WorkoutTemplateEditorScreen.styles';

type TemplateEditorNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'WorkoutTemplateEditor'
>;
type TemplateEditorRouteProp = RouteProp<
  RootStackParamList,
  'WorkoutTemplateEditor'
>;

export default function WorkoutTemplateEditorScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TemplateEditorNavigationProp>();
  const route = useRoute<TemplateEditorRouteProp>();
  const { layout, opacity } = designTokens;

  const workoutId = route.params.workoutId;
  const workouts = useAppStore((state) => state.workouts);
  const settings = useAppStore((state) => state.settings);
  const mutating = useAppStore((state) => state.mutating);
  const error = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);
  const addWorkout = useAppStore((state) => state.addWorkout);
  const editWorkout = useAppStore((state) => state.editWorkout);
  const removeWorkout = useAppStore((state) => state.removeWorkout);

  const workout = useMemo(
    () => workouts.find((candidate) => candidate.id === workoutId) ?? null,
    [workoutId, workouts]
  );

  const builder = useWorkoutBuilderController({
    weightUnit: settings.weightUnit,
    clearStoreError: clearError,
    addWorkout,
    editWorkout,
  });
  const { editingWorkoutId, openComposerForEdit, submitWorkout } = builder;

  useEffect(() => {
    if (!workout || editingWorkoutId === workout.id) {
      return;
    }

    openComposerForEdit(workout);
  }, [editingWorkoutId, openComposerForEdit, workout]);

  const templateDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    []
  );

  const totalSets = workout?.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) ?? 0;
  const supersetPairCount =
    workout?.exercises.filter((exercise) => {
      if (!exercise.supersetExerciseId) {
        return false;
      }

      const partner = workout.exercises.find(
        (candidate) => candidate.id === exercise.supersetExerciseId
      );

      return partner !== undefined && exercise.sortOrder < partner.sortOrder;
    }).length ?? 0;
  const lastSession = workout?.sessions[0] ?? null;

  const handleSave = async () => {
    const saved = await submitWorkout();

    if (saved) {
      navigation.goBack();
    }

    return saved;
  };

  const handleDelete = () => {
    if (!workout) {
      return;
    }

    Alert.alert(
      'Delete template?',
      `Remove ${workout.name} and all of its logged sessions?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await removeWorkout(workout.id);
                navigation.goBack();
              } catch {
                // Store error state will render in the editor.
              }
            })();
          },
        },
      ]
    );
  };

  if (!workout) {
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
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backButton,
              {
                opacity: pressed ? opacity.pressedSoft : 1,
              },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={designTokens.sizes.iconSmall}
              color={theme.palette.textPrimary}
            />
            <AppText variant="label">Workouts</AppText>
          </Pressable>

          <View
            style={[
              styles.missingCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="heading">Template not found</AppText>
            <AppText tone="muted">
              This workout may have been deleted or replaced while you were editing it.
            </AppText>
          </View>
        </ScrollView>
      </View>
    );
  }

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
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            {
              opacity: pressed ? opacity.pressedSoft : 1,
            },
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={designTokens.sizes.iconSmall}
            color={theme.palette.textPrimary}
          />
          <AppText variant="label">Workouts</AppText>
        </Pressable>

        <View
          style={[
            styles.hero,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <AppText variant="micro" tone="accent">
            TEMPLATE EDITOR
          </AppText>
          <AppText variant="title">{workout.name}</AppText>
          <AppText tone="muted">
            Rework exercise order, rest timers, supersets, and progression without squeezing the editor into the workouts tab.
          </AppText>
        </View>

        <View style={styles.metaGrid}>
          <View
            style={[
              styles.metaCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="micro" tone="muted">
              Exercises
            </AppText>
            <AppText variant="heading">{workout.exercises.length}</AppText>
          </View>
          <View
            style={[
              styles.metaCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="micro" tone="muted">
              Total Sets
            </AppText>
            <AppText variant="heading">{totalSets}</AppText>
          </View>
          <View
            style={[
              styles.metaCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="micro" tone="muted">
              Estimated Length
            </AppText>
            <AppText variant="heading">~{estimateWorkoutMinutes(workout)} min</AppText>
          </View>
          <View
            style={[
              styles.metaCard,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="micro" tone="muted">
              Supersets
            </AppText>
            <AppText variant="heading">{supersetPairCount}</AppText>
          </View>
          <View
            style={[
              styles.metaCard,
              styles.metaCardWide,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="micro" tone="muted">
              Last Completed Session
            </AppText>
            <AppText variant="heading">
              {lastSession
                ? templateDateFormatter.format(new Date(lastSession.performedAt))
                : 'No completed sessions yet'}
            </AppText>
          </View>
        </View>

        {error ? <ErrorNotice message={error} /> : null}

        <WorkoutBuilderPanel
          controller={{
            theme,
            settings,
            mutating,
            ...builder,
            submitWorkout: handleSave,
          }}
        />

        <NeonButton
          title="Delete Template"
          variant="danger"
          style={styles.footerButton}
          onPress={handleDelete}
          disabled={mutating}
        />
      </ScrollView>
    </View>
  );
}
