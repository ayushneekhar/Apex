import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder } from "react-native";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { designTokens } from "@/constants/design-system";
import { triggerSelectionHaptic } from "@/lib/haptics";
import {
  getSpotifyNextQueuedTrack,
  getSpotifyNowPlaying,
  isSpotifyConfigured,
  isSpotifyConnected,
  pauseSpotify,
  playSpotify,
  skipSpotifyNext,
  skipSpotifyPrevious,
  SpotifyRateLimitError,
  type SpotifyNowPlaying,
  type SpotifyQueueTrack,
} from "@/lib/spotify";
import type { ActiveWorkoutSession } from "@/types/workout";

import {
  SPOTIFY_POLL_INTERVAL_MS,
  SPOTIFY_RETRY_INTERVAL_MS,
  SPOTIFY_SWIPE_CAPTURE_PX,
  SPOTIFY_SWIPE_PREVIEW_PX,
  SPOTIFY_SWIPE_TRIGGER_PX,
} from "../constants";
import { formatDuration } from "../utils";

type SpotifySwipePreviewDirection = "next" | "previous" | null;
const { sizes } = designTokens;
const SPOTIFY_ARTWORK_SIZE = sizes.iconLarge * 2;

type SpotifyControllerDeps = {
  activeSession: ActiveWorkoutSession | null;
  isSessionScreenOpen: boolean;
  now: number;
};

export function useWorkoutSpotifyController({
  activeSession,
  isSessionScreenOpen,
  now,
}: SpotifyControllerDeps) {
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyNowPlaying, setSpotifyNowPlaying] =
    useState<SpotifyNowPlaying | null>(null);
  const [spotifyNextQueuedTrack, setSpotifyNextQueuedTrack] =
    useState<SpotifyQueueTrack | null>(null);
  const [spotifyPreviousTrack, setSpotifyPreviousTrack] =
    useState<SpotifyQueueTrack | null>(null);
  const [spotifyProgressSyncedAtMs, setSpotifyProgressSyncedAtMs] = useState<
    number | null
  >(null);
  const [spotifyControlBusy, setSpotifyControlBusy] = useState(false);
  const [spotifyControlError, setSpotifyControlError] = useState<string | null>(
    null
  );
  const [spotifySwipePreviewDirection, setSpotifySwipePreviewDirection] =
    useState<SpotifySwipePreviewDirection>(null);

  const spotifyConfigured = isSpotifyConfigured();
  const activeWorkoutId = activeSession?.workoutId ?? null;

  const spotifyCardTranslateX = useSharedValue(0);
  const ignoreNextSpotifyTapRef = useRef(false);
  const lastNowPlayingRef = useRef<SpotifyNowPlaying | null>(null);

  const clearSpotifyPlayback = useCallback(() => {
    setSpotifyNowPlaying(null);
    setSpotifyNextQueuedTrack(null);
    setSpotifyPreviousTrack(null);
    setSpotifyProgressSyncedAtMs(null);
    lastNowPlayingRef.current = null;
  }, []);

  const applySpotifyPlayback = useCallback(
    (
      playback: SpotifyNowPlaying | null,
      nextQueuedTrack: SpotifyQueueTrack | null = null
    ) => {
      const lastTrack = lastNowPlayingRef.current;

      if (playback && lastTrack) {
        const lastTrackId =
          lastTrack.trackUrl ??
          `${lastTrack.songName}::${lastTrack.artistNames}::${lastTrack.albumName}`;
        const nextTrackId =
          playback.trackUrl ??
          `${playback.songName}::${playback.artistNames}::${playback.albumName}`;

        if (lastTrackId !== nextTrackId) {
          setSpotifyPreviousTrack({
            songName: lastTrack.songName,
            artistNames: lastTrack.artistNames,
            albumName: lastTrack.albumName,
            albumArtUrl: lastTrack.albumArtUrl,
            trackUrl: lastTrack.trackUrl,
            durationMs: lastTrack.durationMs,
          });
        }
      }

      setSpotifyNowPlaying(playback);
      setSpotifyNextQueuedTrack(playback ? nextQueuedTrack : null);
      setSpotifyProgressSyncedAtMs(playback ? Date.now() : null);
      lastNowPlayingRef.current = playback;
    },
    []
  );

  const refreshSpotifyPlaybackSnapshot = useCallback(async () => {
    const playback = await getSpotifyNowPlaying();

    if (!playback) {
      applySpotifyPlayback(null, null);
      return;
    }

    let nextQueuedTrack: SpotifyQueueTrack | null = null;

    try {
      nextQueuedTrack = await getSpotifyNextQueuedTrack();
    } catch (spotifyQueueError) {
      if (spotifyQueueError instanceof SpotifyRateLimitError) {
        throw spotifyQueueError;
      }
    }

    applySpotifyPlayback(playback, nextQueuedTrack);
  }, [applySpotifyPlayback]);

  const runSpotifyControl = useCallback(
    async (
      operation: () => Promise<void>,
      options?: { triggerHapticOnSuccess?: boolean }
    ) => {
      if (spotifyControlBusy) {
        return;
      }

      setSpotifyControlBusy(true);
      setSpotifyControlError(null);

      try {
        await operation();
        if (options?.triggerHapticOnSuccess !== false) {
          triggerSelectionHaptic();
        }
        await refreshSpotifyPlaybackSnapshot();
      } catch (spotifyError) {
        setSpotifyControlError(
          spotifyError instanceof Error
            ? spotifyError.message
            : "Could not control Spotify playback."
        );
      } finally {
        setSpotifyControlBusy(false);
      }
    },
    [refreshSpotifyPlaybackSnapshot, spotifyControlBusy]
  );

  const handleSpotifyCardPress = useCallback(() => {
    if (ignoreNextSpotifyTapRef.current) {
      ignoreNextSpotifyTapRef.current = false;
      return;
    }

    if (!spotifyNowPlaying || spotifyControlBusy) {
      return;
    }

    void runSpotifyControl(() =>
      spotifyNowPlaying.isPlaying ? pauseSpotify() : playSpotify()
    );
  }, [runSpotifyControl, spotifyControlBusy, spotifyNowPlaying]);

  const handleSpotifySwipeNext = useCallback(() => {
    if (spotifyControlBusy) {
      return;
    }

    triggerSelectionHaptic();
    void runSpotifyControl(skipSpotifyNext, { triggerHapticOnSuccess: false });
  }, [runSpotifyControl, spotifyControlBusy]);

  const handleSpotifySwipePrevious = useCallback(() => {
    if (spotifyControlBusy) {
      return;
    }

    triggerSelectionHaptic();
    void runSpotifyControl(skipSpotifyPrevious, { triggerHapticOnSuccess: false });
  }, [runSpotifyControl, spotifyControlBusy]);

  const spotifyCardContentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 0 }],
    opacity: 1,
  }));

  const spotifyCardPreviewMaskAnimatedStyle = useAnimatedStyle(() => {
    const translateX = spotifyCardTranslateX.value;
    const progress = Math.min(
      1,
      Math.abs(translateX) / Math.max(1, SPOTIFY_SWIPE_PREVIEW_PX)
    );

    return {
      opacity: progress > 0 ? 1 : 0,
      width: SPOTIFY_SWIPE_PREVIEW_PX * progress,
    };
  });

  const spotifyCurrentArtworkAnimatedStyle = useAnimatedStyle(() => {
    const translateX = spotifyCardTranslateX.value;
    const progress = Math.min(
      1,
      Math.abs(translateX) / Math.max(1, SPOTIFY_SWIPE_PREVIEW_PX)
    );

    return {
      width: SPOTIFY_ARTWORK_SIZE * (1 - progress),
      opacity: 1 - progress,
    };
  });

  const spotifyPreviewContentAnimatedStyle = useAnimatedStyle(() => {
    const translateX = spotifyCardTranslateX.value;
    const progress = Math.min(
      1,
      Math.abs(translateX) / Math.max(1, SPOTIFY_SWIPE_PREVIEW_PX)
    );

    return {
      opacity: progress,
      transform: [{ translateX: -8 * (1 - progress) }],
    };
  });

  const spotifyCardPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (!spotifyNowPlaying || spotifyControlBusy) {
            return false;
          }

          const horizontalDistance = Math.abs(gestureState.dx);
          return (
            horizontalDistance >= SPOTIFY_SWIPE_CAPTURE_PX &&
            horizontalDistance > Math.abs(gestureState.dy)
          );
        },
        onPanResponderMove: (_, gestureState) => {
          const clampedDx = Math.max(
            -SPOTIFY_SWIPE_PREVIEW_PX,
            Math.min(SPOTIFY_SWIPE_PREVIEW_PX, gestureState.dx)
          );

          setSpotifySwipePreviewDirection(
            clampedDx === 0 ? null : clampedDx < 0 ? "next" : "previous"
          );
          spotifyCardTranslateX.value = clampedDx;
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldSkipNext = gestureState.dx <= -SPOTIFY_SWIPE_TRIGGER_PX;
          const shouldSkipPrevious =
            gestureState.dx >= SPOTIFY_SWIPE_TRIGGER_PX;

          if (shouldSkipNext || shouldSkipPrevious) {
            ignoreNextSpotifyTapRef.current = true;

            if (shouldSkipNext) {
              handleSpotifySwipeNext();
            } else {
              handleSpotifySwipePrevious();
            }
          }

          setSpotifySwipePreviewDirection(null);
          spotifyCardTranslateX.value = withTiming(0, {
            duration: 160,
            easing: Easing.linear,
          });
        },
        onPanResponderTerminate: () => {
          setSpotifySwipePreviewDirection(null);
          spotifyCardTranslateX.value = withTiming(0, {
            duration: 160,
            easing: Easing.linear,
          });
        },
      }),
    [
      handleSpotifySwipeNext,
      handleSpotifySwipePrevious,
      spotifyCardTranslateX,
      spotifyControlBusy,
      spotifyNowPlaying,
    ]
  );

  const resetSpotifySessionUi = useCallback(() => {
    setSpotifyConnected(false);
    clearSpotifyPlayback();
    setSpotifyControlBusy(false);
    setSpotifyControlError(null);
    setSpotifySwipePreviewDirection(null);
    spotifyCardTranslateX.value = 0;
  }, [clearSpotifyPlayback, spotifyCardTranslateX]);

  useEffect(() => {
    if (!isSessionScreenOpen || !activeWorkoutId) {
      resetSpotifySessionUi();
      return;
    }

    if (!spotifyConfigured) {
      resetSpotifySessionUi();
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextPoll = (delayMs: number) => {
      timeoutId = setTimeout(() => {
        void pollSpotify();
      }, delayMs);
    };

    const pollSpotify = async () => {
      try {
        const connected = await isSpotifyConnected();

        if (cancelled) {
          return;
        }

        setSpotifyConnected(connected);

        if (!connected) {
          clearSpotifyPlayback();
          scheduleNextPoll(SPOTIFY_RETRY_INTERVAL_MS);
          return;
        }

        await refreshSpotifyPlaybackSnapshot();

        if (cancelled) {
          return;
        }

        scheduleNextPoll(SPOTIFY_POLL_INTERVAL_MS);
      } catch (spotifyError) {
        if (cancelled) {
          return;
        }

        if (spotifyError instanceof SpotifyRateLimitError) {
          clearSpotifyPlayback();
          scheduleNextPoll(
            Math.max(spotifyError.retryAfterMs, SPOTIFY_RETRY_INTERVAL_MS)
          );
          return;
        }

        clearSpotifyPlayback();
        scheduleNextPoll(SPOTIFY_RETRY_INTERVAL_MS);
      }
    };

    void pollSpotify();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    activeWorkoutId,
    clearSpotifyPlayback,
    isSessionScreenOpen,
    refreshSpotifyPlaybackSnapshot,
    resetSpotifySessionUi,
    spotifyCardTranslateX,
    spotifyConfigured,
  ]);

  const spotifyLiveProgressMs = useMemo(() => {
    if (!spotifyNowPlaying) {
      return 0;
    }

    const baseProgressMs = Math.max(0, spotifyNowPlaying.progressMs);

    if (!spotifyNowPlaying.isPlaying || spotifyProgressSyncedAtMs === null) {
      return spotifyNowPlaying.durationMs > 0
        ? Math.min(baseProgressMs, spotifyNowPlaying.durationMs)
        : baseProgressMs;
    }

    const elapsedSinceSyncMs = Math.max(0, now - spotifyProgressSyncedAtMs);
    const progressedMs = baseProgressMs + elapsedSinceSyncMs;

    return spotifyNowPlaying.durationMs > 0
      ? Math.min(progressedMs, spotifyNowPlaying.durationMs)
      : progressedMs;
  }, [now, spotifyNowPlaying, spotifyProgressSyncedAtMs]);

  const spotifyProgressLabel =
    spotifyNowPlaying && spotifyNowPlaying.durationMs > 0
      ? `${formatDuration(spotifyLiveProgressMs)} / ${formatDuration(
          spotifyNowPlaying.durationMs
        )}`
      : null;

  const showSpotifyCard = spotifyConnected && spotifyNowPlaying !== null;

  return {
    spotifyConnected,
    spotifyNowPlaying,
    spotifyNextQueuedTrack,
    spotifyPreviousTrack,
    spotifySwipePreviewDirection,
    spotifyControlBusy,
    spotifyControlError,
    spotifyProgressLabel,
    showSpotifyCard,
    spotifyCardAnimatedStyle: spotifyCardContentAnimatedStyle,
    spotifyCardContentAnimatedStyle,
    spotifyCardPreviewAnimatedStyle: spotifyCardPreviewMaskAnimatedStyle,
    spotifyCardPreviewMaskAnimatedStyle,
    spotifyCurrentArtworkAnimatedStyle,
    spotifyPreviewContentAnimatedStyle,
    spotifyCardPanResponder,
    handleSpotifyCardPress,
  };
}

export type WorkoutSpotifyController = ReturnType<
  typeof useWorkoutSpotifyController
>;
