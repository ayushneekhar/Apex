import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { designTokens } from '@/constants/design-system';
import { formatWeightFromKg } from '@/lib/weight';

import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import { formatDuration } from '../utils';
import { styles } from './SessionSummaryCard.styles';

const { opacity, sizes } = designTokens;

export function SessionSummaryCard({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  const { activeSession, theme, settings } = controller;

  if (!activeSession) {
    return null;
  }

  const overtimeFillPercent =
    controller.activeRestTimer && controller.restOvertimeMs > 0
      ? Math.min(
          100,
          Math.round(
            (controller.restOvertimeMs /
              (controller.activeRestTimer.durationMs + controller.restOvertimeMs)) *
              100
          )
        )
      : 0;
  const baseFillPercent =
    controller.restIsComplete && controller.restOvertimeMs > 0
      ? Math.max(0, 100 - overtimeFillPercent)
      : Math.round(controller.restProgress * 100);

  return (
    <View
      style={[
        styles.timerCard,
        {
          borderColor: theme.palette.border,
          backgroundColor: theme.palette.panel,
        },
      ]}
    >
      <AppText variant="micro" tone="muted">
        Session Time
      </AppText>
      <View style={styles.timerValueRow}>
        <AppText variant="display">{formatDuration(controller.sessionElapsed)}</AppText>
        <Pressable
          onPress={() => {
            void controller.toggleSessionPaused();
          }}
          style={({ pressed }) => [
            styles.timerControlButton,
            {
              borderColor: activeSession.isPaused ? theme.palette.accent : theme.palette.border,
              backgroundColor: activeSession.isPaused
                ? `${theme.palette.accent}24`
                : theme.palette.panelSoft,
              opacity: pressed ? opacity.pressedSoft : 1,
            },
          ]}
        >
          <Ionicons
            name={activeSession.isPaused ? 'play' : 'pause'}
            size={sizes.iconLarge}
            color={activeSession.isPaused ? theme.palette.accent : theme.palette.textPrimary}
          />
        </Pressable>
      </View>

      {controller.showSpotifyCard && controller.spotifyNowPlaying ? (
        <Animated.View
          entering={FadeIn.duration(220).easing(Easing.linear)}
          exiting={FadeOut.duration(160).easing(Easing.linear)}
          {...controller.spotifyCardPanResponder.panHandlers}
        >
          <Pressable
            onPress={controller.handleSpotifyCardPress}
            disabled={controller.spotifyControlBusy}
            style={({ pressed }) => [
              styles.spotifyCard,
              {
                borderColor: theme.palette.accent,
                backgroundColor: theme.palette.panelSoft,
                opacity: pressed || controller.spotifyControlBusy ? opacity.pressedSoft : 1,
              },
            ]}
          >
            <View style={styles.spotifyCardStack}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.spotifyCardPreviewLayer,
                  {
                    backgroundColor: theme.palette.panelSoft,
                  },
                  controller.spotifyCardPreviewMaskAnimatedStyle,
                ]}
              >
                <Animated.View
                  style={[
                    styles.spotifyCardPreviewContent,
                    controller.spotifyPreviewContentAnimatedStyle,
                  ]}
                >
                  {controller.spotifySwipePreviewDirection === 'next' ? (
                    <View style={styles.spotifyTrackText}>
                      <View style={styles.spotifyPreviewMetaRow}>
                        <Ionicons
                          name="play-skip-forward"
                          size={sizes.iconSmall}
                          color={theme.palette.accent}
                        />
                        <AppText variant="micro" tone="accent">
                          Up Next
                        </AppText>
                      </View>
                      <AppText variant="label" numberOfLines={1}>
                        {controller.spotifyNextQueuedTrack?.songName ?? 'No next track in queue'}
                      </AppText>
                      <AppText variant="micro" tone="muted" numberOfLines={1}>
                        {controller.spotifyNextQueuedTrack?.artistNames ?? 'Start a queue in Spotify'}
                      </AppText>
                    </View>
                  ) : controller.spotifySwipePreviewDirection === 'previous' ? (
                    <View style={styles.spotifyTrackText}>
                      <View style={styles.spotifyPreviewMetaRow}>
                        <Ionicons
                          name="play-skip-back"
                          size={sizes.iconSmall}
                          color={theme.palette.accent}
                        />
                        <AppText variant="micro" tone="accent">
                          Previous
                        </AppText>
                      </View>
                      <AppText variant="label" numberOfLines={1}>
                        {controller.spotifyPreviousTrack?.songName ?? 'Previous track'}
                      </AppText>
                      <AppText variant="micro" tone="muted" numberOfLines={1}>
                        {controller.spotifyPreviousTrack?.artistNames ??
                          'Swipe to go back in playback'}
                      </AppText>
                    </View>
                  ) : null}
                </Animated.View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.spotifyCardContentLayer,
                  controller.spotifyCardContentAnimatedStyle,
                ]}
              >
                <View style={styles.spotifyTrackRow}>
                  <Animated.View
                    style={[
                      styles.spotifyArtworkWrap,
                      controller.spotifyCurrentArtworkAnimatedStyle,
                    ]}
                  >
                    {controller.spotifyNowPlaying.albumArtUrl ? (
                      <Image
                        source={{ uri: controller.spotifyNowPlaying.albumArtUrl }}
                        contentFit="cover"
                        style={styles.spotifyArtwork}
                      />
                    ) : (
                      <View
                        style={[
                          styles.spotifyArtworkFallback,
                          {
                            borderColor: theme.palette.border,
                            backgroundColor: theme.palette.background,
                          },
                        ]}
                      >
                        <Ionicons
                          name="musical-notes"
                          size={sizes.iconSmall}
                          color={theme.palette.textMuted}
                        />
                      </View>
                    )}
                  </Animated.View>

                  <View style={styles.spotifyTrackText}>
                    <AppText variant="label" numberOfLines={1}>
                      {controller.spotifyNowPlaying.songName}
                    </AppText>
                    <AppText variant="micro" tone="muted" numberOfLines={1}>
                      {controller.spotifyNowPlaying.artistNames}
                    </AppText>
                    <AppText variant="micro" tone="muted" numberOfLines={1}>
                      {controller.spotifyNowPlaying.albumName}
                    </AppText>
                    {controller.spotifyProgressLabel ? (
                      <AppText
                        variant="micro"
                        tone={controller.spotifyNowPlaying.isPlaying ? "accent" : "muted"}
                      >
                        {controller.spotifyNowPlaying.isPlaying ? "Playing" : "Paused"} •{" "}
                        {controller.spotifyProgressLabel}
                      </AppText>
                    ) : null}
                    {controller.spotifyControlError ? (
                      <AppText variant="micro" tone="danger" numberOfLines={2}>
                        {controller.spotifyControlError}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              </Animated.View>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      {controller.activeRestTimer ? (
        <View
          style={[
            styles.restTimerCard,
            {
              borderColor:
                controller.restOvertimeMs > 0
                  ? theme.palette.danger
                  : controller.restIsComplete
                    ? theme.palette.success
                    : theme.palette.accent,
              backgroundColor: theme.palette.panelSoft,
            },
          ]}
        >
          <View style={styles.restTimerHeaderRow}>
            <AppText variant="micro" tone="muted">
              Rest Timer
            </AppText>
            <AppText
              variant="label"
              tone={
                controller.restOvertimeMs > 0
                  ? 'danger'
                  : controller.restIsComplete
                    ? 'success'
                    : 'accent'
              }
            >
              {controller.restIsComplete
                ? controller.restOvertimeMs > 0
                  ? `+${formatDuration(controller.restOvertimeMs)}`
                  : 'Ready'
                : formatDuration(controller.restRemainingMs)}
            </AppText>
          </View>
          <AppText tone="muted">
            {controller.restOvertimeMs > 0
              ? `${controller.activeRestTimer.exerciseName}: overtime rest.`
              : controller.restIsComplete
                ? `${controller.activeRestTimer.exerciseName}: go crush the next set.`
                : `${controller.activeRestTimer.exerciseName}: recover now.`}
          </AppText>
          <View style={styles.restProgressRow}>
            <View style={[styles.restProgressTrack, { borderColor: theme.palette.border }]}>
              <View
                style={[
                  styles.restProgressFill,
                  {
                    backgroundColor: controller.restIsComplete
                      ? theme.palette.success
                      : theme.palette.accent,
                    width: `${baseFillPercent}%`,
                  },
                ]}
              />
              {controller.restOvertimeMs > 0 ? (
                <View
                  style={[
                    styles.restProgressOvertimeFill,
                    {
                      backgroundColor: theme.palette.danger,
                      width: `${overtimeFillPercent}%`,
                    },
                  ]}
                />
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.sessionStatsRow}>
        <StatCell label="Completed" value={String(controller.completedSetCount)} />
        <StatCell
          label="Total Lifted"
          value={formatWeightFromKg(controller.totalSessionVolumeKg, settings.weightUnit)}
        />
        <StatCell
          label="Remaining"
          value={String(Math.max(0, activeSession.sets.length - controller.completedSetCount))}
        />
      </View>

      {activeSession.restoredFromAppClose && activeSession.isPaused ? (
        <View style={[styles.recoveryCard, { borderColor: theme.palette.accent }]}>
          <AppText tone="accent">
            Session was paused after app relaunch. Tap Resume to continue the timer.
          </AppText>
        </View>
      ) : null}
    </View>
  );

  function StatCell({ label, value }: { label: string; value: string }) {
    return (
      <View style={styles.sessionStatCell}>
        <AppText variant="micro" tone="muted" style={styles.sessionStatLabel}>
          {label}
        </AppText>
        <AppText variant="heading">{value}</AppText>
      </View>
    );
  }
}
