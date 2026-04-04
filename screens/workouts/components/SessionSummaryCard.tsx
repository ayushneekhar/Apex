import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { designTokens } from "@/constants/design-system";
import { formatWeightFromKg } from "@/lib/weight";

import type { WorkoutsScreenController } from "../hooks/use-workouts-screen-controller";
import { formatDuration } from "../utils";
import { styles } from "./SessionSummaryCard.styles";

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
              (controller.activeRestTimer.durationMs +
                controller.restOvertimeMs)) *
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
        <AppText variant="display">
          {formatDuration(controller.sessionElapsed)}
        </AppText>
        <Pressable
          onPress={() => {
            void controller.toggleSessionPaused();
          }}
          style={({ pressed }) => [
            styles.timerControlButton,
            {
              borderColor: activeSession.isPaused
                ? theme.palette.accent
                : theme.palette.border,
              backgroundColor: activeSession.isPaused
                ? `${theme.palette.accent}24`
                : theme.palette.panelSoft,
              opacity: pressed ? opacity.pressedSoft : 1,
            },
          ]}
        >
          <Ionicons
            name={activeSession.isPaused ? "play" : "pause"}
            size={sizes.iconLarge}
            color={
              activeSession.isPaused
                ? theme.palette.accent
                : theme.palette.textPrimary
            }
          />
        </Pressable>
      </View>

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
                  ? "danger"
                  : controller.restIsComplete
                  ? "success"
                  : "accent"
              }
            >
              {controller.restIsComplete
                ? controller.restOvertimeMs > 0
                  ? `+${formatDuration(controller.restOvertimeMs)}`
                  : "Ready"
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
            <View
              style={[
                styles.restProgressTrack,
                { borderColor: theme.palette.border },
              ]}
            >
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
        <StatCell
          label="Completed"
          value={String(controller.completedSetCount)}
        />
        <StatCell
          label="Total Lifted"
          value={formatWeightFromKg(
            controller.totalSessionVolumeKg,
            settings.weightUnit
          )}
        />
        <StatCell
          label="Remaining"
          value={String(
            Math.max(
              0,
              activeSession.sets.length - controller.completedSetCount
            )
          )}
        />
      </View>

      {activeSession.restoredFromAppClose && activeSession.isPaused ? (
        <View
          style={[styles.recoveryCard, { borderColor: theme.palette.accent }]}
        >
          <AppText tone="accent">
            Session was paused after app relaunch. Tap Resume to continue the
            timer.
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
