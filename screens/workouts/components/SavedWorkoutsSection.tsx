import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';

import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import { ErrorNotice } from './common/ErrorNotice';
import { SavedWorkoutCard } from './SavedWorkoutCard';
import { styles } from './SavedWorkoutsSection.styles';

export function SavedWorkoutsSection({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  const { theme } = controller;

  return (
    <View style={styles.list}>
      {controller.activeSession ? (
        <View
          style={[
            styles.resumeBanner,
            {
              borderColor: theme.palette.accent,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <View style={styles.resumeBannerTextWrap}>
            <AppText variant="label" tone="accent">
              Active Session
            </AppText>
            <AppText variant="heading">{controller.activeSession.workoutName}</AppText>
          </View>
          <NeonButton title="Open" onPress={controller.openSessionScreen} />
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <AppText variant="heading">Saved Workouts</AppText>
        <AppText variant="micro" tone="muted">
          {controller.workouts.length} total
        </AppText>
      </View>

      {controller.error ? <ErrorNotice message={controller.error} /> : null}
      {controller.sessionActionError ? <ErrorNotice message={controller.sessionActionError} /> : null}

      {controller.workouts.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <AppText variant="heading">No workouts yet</AppText>
          <AppText tone="muted">
            Add your first workout to unlock quick starts, live timer tracking, and set-by-set session logs.
          </AppText>
        </View>
      ) : null}

      {controller.workouts.map((workout) => (
        <SavedWorkoutCard key={workout.id} controller={controller} workout={workout} />
      ))}
    </View>
  );
}
