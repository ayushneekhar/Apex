import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import Animated, { Easing, SlideInRight, SlideOutRight } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import { designTokens } from '@/constants/design-system';

import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import { DiscardSessionModal } from './DiscardSessionModal';
import { EditCustomSetModal } from './EditCustomSetModal';
import { ErrorNotice } from './common/ErrorNotice';
import { SessionExerciseList } from './SessionExerciseList';
import { SessionFooterActions } from './SessionFooterActions';
import { SessionSummaryCard } from './SessionSummaryCard';
import { styles } from './ActiveSessionOverlay.styles';

const { layout, opacity, sizes } = designTokens;

export function ActiveSessionOverlay({
  controller,
  insets,
}: {
  controller: WorkoutsScreenController;
  insets: EdgeInsets;
}) {
  const { activeSession, theme } = controller;

  if (!controller.isSessionScreenOpen || !activeSession) {
    return null;
  }

  return (
    <Animated.View
      entering={SlideInRight.duration(280).easing(Easing.out(Easing.cubic))}
      exiting={SlideOutRight.duration(220).easing(Easing.in(Easing.cubic))}
      style={[
        styles.overlay,
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
        <Animated.View
          style={[
            styles.sessionHeader,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
            controller.sessionHeaderAnimatedStyle,
          ]}
        >
          <Pressable
            onPress={controller.closeSessionScreen}
            style={({ pressed }) => [
              styles.backButton,
              { opacity: pressed ? opacity.pressedSoft : 1 },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={sizes.iconSmall}
              color={theme.palette.textPrimary}
            />
            <AppText variant="label">Workouts</AppText>
          </Pressable>

          <Animated.View
            pointerEvents={controller.shouldCompactSessionHeader ? 'none' : 'auto'}
            style={[styles.sessionHeaderDetails, controller.sessionHeaderDetailsAnimatedStyle]}
          >
            <AppText variant="heading">{activeSession.workoutName}</AppText>
            <AppText tone="muted">
              Tap top of a set to mark complete or decrement reps. Press and hold the set to edit reps. Tap bottom strip to edit weight.
            </AppText>
          </Animated.View>
        </Animated.View>

        <SessionSummaryCard controller={controller} />
        <SessionExerciseList controller={controller} />

        {(controller.sessionActionError || controller.error) && !controller.formError ? (
          <ErrorNotice message={controller.sessionActionError ?? controller.error ?? ''} />
        ) : null}

        <SessionFooterActions controller={controller} />
      </ScrollView>

      <EditCustomSetModal controller={controller} />
      <DiscardSessionModal controller={controller} />
    </Animated.View>
  );
}
