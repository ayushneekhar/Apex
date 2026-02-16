import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

import type { AppTheme } from "@/constants/app-themes";
import { designTokens } from "@/constants/design-system";

const { border, sizes, spacing, typography } = designTokens;

export const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export function createTabScreenOptions(
  theme: AppTheme,
  insets: EdgeInsets
): BottomTabNavigationOptions {
  return {
    headerShown: false,
    animation: "shift",
    lazy: false,
    sceneStyle: {
      backgroundColor: theme.palette.background,
    },
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
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <BlurView
          tint={theme.statusBarStyle === "light" ? "dark" : "light"}
          intensity={40}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: `${theme.palette.panel}33`,
            },
          ]}
        />
      </View>
    ),
    tabBarLabelStyle: {
      fontFamily: "Unbounded_500Medium",
      fontSize: typography.microSize,
      textTransform: "uppercase",
      letterSpacing: typography.tabLabelLetterSpacing,
      marginBottom: spacing.xxxs,
    },
  };
}
