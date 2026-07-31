import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import { designTokens } from '@/constants/design-system';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAppStore } from '@/store/use-app-store';
import type { RootStackParamList } from '@/types/navigation';

import { ErrorNotice } from './workouts/components/common/ErrorNotice';
import { WorkoutBuilderPanel } from './workouts/components/WorkoutBuilderPanel';
import { useWorkoutBuilderController } from './workouts/hooks/use-workout-builder-controller';
import { styles } from './WorkoutTemplateEditorScreen.styles';

type TemplateCreatorNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'WorkoutTemplateCreator'
>;

export default function WorkoutTemplateCreatorScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TemplateCreatorNavigationProp>();
  const { layout, opacity } = designTokens;

  const workouts = useAppStore((state) => state.workouts);
  const activeWorkoutCount = workouts.filter((workout) => workout.archivedAt === null).length;
  const settings = useAppStore((state) => state.settings);
  const mutating = useAppStore((state) => state.mutating);
  const error = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);
  const addWorkout = useAppStore((state) => state.addWorkout);
  const editWorkout = useAppStore((state) => state.editWorkout);

  const builder = useWorkoutBuilderController({
    weightUnit: settings.weightUnit,
    workoutCount: activeWorkoutCount,
    clearStoreError: clearError,
    addWorkout,
    editWorkout,
  });
  const { openComposer, submitWorkout } = builder;

  useEffect(() => {
    openComposer();
  }, [openComposer]);

  const handleSave = async () => {
    const saved = await submitWorkout();

    if (saved) {
      navigation.goBack();
    }

    return saved;
  };

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
            NEW TEMPLATE
          </AppText>
          <AppText variant="title">Create Workout</AppText>
          <AppText tone="muted">
            Build a reusable workout template with exercises, sets, rest timers, and progression targets.
          </AppText>
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
      </ScrollView>
    </View>
  );
}
