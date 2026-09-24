import { StyleSheet } from "react-native";

import { designTokens } from "@/constants/design-system";

const { border, radii, sizes, spacing } = designTokens;

export const styles = StyleSheet.create({
  timerCard: {
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  timerValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  timerControlButton: {
    width: sizes.iconButton,
    height: sizes.iconButton,
    borderWidth: border.thin,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  restTimerCard: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  restTimerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sessionStatsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sessionStatCell: {
    flex: 1,
    gap: spacing.xxs,
    alignItems: "center",
  },
  sessionStatLabel: {
    minHeight: sizes.setBoxMinLabelHeight,
    textAlign: "center",
  },
  recoveryCard: {
    borderWidth: border.thin,
    borderRadius: radii.xl,
    padding: spacing.md,
  },
});
