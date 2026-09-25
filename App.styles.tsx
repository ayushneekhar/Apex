import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import type { RefObject } from "react";
import { StyleSheet, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

import type { AppTheme } from "@/constants/app-themes";
import { designTokens } from "@/constants/design-system";

const { border, radii, sizes, spacing } = designTokens;

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  updatePrompt: {
    position: "absolute",
    borderWidth: border.thin,
    borderRadius: radii.panel,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  updatePromptActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  updatePromptButton: {
    flex: 1,
    minHeight: sizes.controlMinHeight,
    borderRadius: radii.xl,
    borderWidth: border.thin,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
});

/**
 * `blurTarget` must wrap the tab scenes: on Android the blur samples that view,
 * and without it expo-blur silently falls back to a flat translucent fill.
 */
export function createTabScreenOptions(
  theme: AppTheme,
  insets: EdgeInsets,
  blurTarget: RefObject<View | null> | undefined
): BottomTabNavigationOptions {
  return {
    headerShown: false,
    animation: "shift",
    lazy: false,
    sceneStyle: {
      backgroundColor: theme.palette.background,
    },
    tabBarShowLabel: false,
    tabBarActiveTintColor: theme.palette.accent,
    tabBarInactiveTintColor: theme.palette.textMuted,
    tabBarStyle: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "transparent",
      borderTopColor: `${theme.palette.border}88`,
      borderTopWidth: border.thin,
      overflow: "hidden",
      height: sizes.tabBarBaseHeight + insets.bottom,
      paddingTop: spacing.xs,
      paddingBottom: Math.max(insets.bottom, spacing.xs),
    },
    tabBarBackground: () => (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <BlurView
          tint={theme.statusBarStyle === "light" ? "dark" : "light"}
          intensity={40}
          blurMethod="dimezisBlurView"
          blurTarget={blurTarget}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: `${theme.palette.panel}33`,
            },
          ]}
        />
      </View>
    ),
  };
}
