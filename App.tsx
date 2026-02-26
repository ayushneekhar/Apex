import "react-native-reanimated";

import {
  Unbounded_400Regular,
  Unbounded_500Medium,
  Unbounded_700Bold,
  useFonts,
} from "@expo-google-fonts/unbounded";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  DarkTheme,
  NavigationContainer,
  type Theme,
} from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { createTabScreenOptions, styles } from "@/App.styles";
import { AppText } from "@/components/ui/app-text";
import type { AppTheme } from "@/constants/app-themes";
import { designTokens } from "@/constants/design-system";
import { useAppTheme } from "@/hooks/use-app-theme";
import { triggerSelectionHaptic } from "@/lib/haptics";
import {
  checkNitroOtaForUpdates,
  confirmNitroOtaBundleIfAvailable,
  downloadNitroOtaUpdate,
  reloadNitroOtaApp,
  subscribeNitroOtaRollbacks,
  type NitroOtaUpdateCheck,
} from "@/lib/nitro-ota";
import AnalyticsScreen from "@/screens/AnalyticsScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import WorkoutsScreen from "@/screens/WorkoutsScreen";
import { useAppStore } from "@/store/use-app-store";

void SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();

const APP_TABS = [
  {
    name: "Workouts",
    component: WorkoutsScreen,
    iconName: "barbell-outline" as const,
    hapticOnPress: false,
  },
  {
    name: "History",
    component: HistoryScreen,
    iconName: "time-outline" as const,
    hapticOnPress: true,
  },
  {
    name: "Analytics",
    component: AnalyticsScreen,
    iconName: "stats-chart-outline" as const,
    hapticOnPress: true,
  },
  {
    name: "Settings",
    component: SettingsScreen,
    iconName: "settings-outline" as const,
    hapticOnPress: true,
  },
] as const;

function RootTabs({
  navigationTheme,
  theme,
  updateCheck,
  updateBusy,
  onDismissUpdate,
  onApplyUpdate,
}: {
  navigationTheme: Theme;
  theme: AppTheme;
  updateCheck: NitroOtaUpdateCheck | null;
  updateBusy: boolean;
  onDismissUpdate: () => void;
  onApplyUpdate: () => void;
}) {
  const insets = useSafeAreaInsets();
  const showUpdatePrompt = Boolean(updateCheck?.hasUpdate && updateCheck.isCompatible);

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.background }}>
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          initialRouteName="Workouts"
          detachInactiveScreens={false}
          screenOptions={createTabScreenOptions(theme, insets)}
        >
          {APP_TABS.map((screen) => (
            <Tab.Screen
              key={screen.name}
              name={screen.name}
              component={screen.component}
              listeners={
                screen.hapticOnPress
                  ? {
                      tabPress: triggerSelectionHaptic,
                    }
                  : undefined
              }
              options={{
                tabBarIcon: ({ color, size }) => (
                  <Ionicons name={screen.iconName} size={size} color={color} />
                ),
              }}
            />
          ))}
        </Tab.Navigator>

        {showUpdatePrompt ? (
          <View
            style={[
              styles.updatePrompt,
              {
                left: designTokens.layout.screenHorizontalInset,
                right: designTokens.layout.screenHorizontalInset,
                bottom:
                  insets.bottom +
                  designTokens.sizes.tabBarBaseHeight +
                  designTokens.spacing.md,
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="label">New App Update Available</AppText>
            <AppText tone="muted">Would you like to update now?</AppText>
            <View style={styles.updatePromptActions}>
              <Pressable
                onPress={onDismissUpdate}
                style={({ pressed }) => [
                  styles.updatePromptButton,
                  {
                    borderColor: theme.palette.border,
                    opacity: pressed ? designTokens.opacity.pressedSoft : 1,
                  },
                ]}
              >
                <AppText variant="label" tone="muted">
                  Later
                </AppText>
              </Pressable>
              <Pressable
                onPress={onApplyUpdate}
                disabled={updateBusy}
                style={({ pressed }) => [
                  styles.updatePromptButton,
                  {
                    borderColor: theme.palette.accent,
                    backgroundColor: theme.palette.accent,
                    opacity: updateBusy
                      ? designTokens.opacity.disabled
                      : pressed
                      ? designTokens.opacity.pressedSoft
                      : 1,
                  },
                ]}
              >
                <AppText variant="label" tone="inverse">
                  {updateBusy ? "Updating..." : "Update"}
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : null}

        <StatusBar style={theme.statusBarStyle} />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  const theme = useAppTheme();
  const bootstrapError = useAppStore((state) => state.error);
  const hydrated = useAppStore((state) => state.hydrated);
  const bootstrap = useAppStore((state) => state.bootstrap);
  const updateCheck = useAppStore((state) => state.nitroOtaUpdateCheck);
  const setNitroOtaUpdateCheck = useAppStore(
    (state) => state.setNitroOtaUpdateCheck
  );
  const [updateBusy, setUpdateBusy] = useState(false);

  const [fontsLoaded] = useFonts({
    Unbounded_400Regular,
    Unbounded_500Medium,
    Unbounded_700Bold,
  });

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    return subscribeNitroOtaRollbacks((record) => {
      console.warn("Nitro OTA rollback", record);
    });
  }, []);

  const appReady = fontsLoaded && (hydrated || Boolean(bootstrapError));

  useEffect(() => {
    if (!appReady) {
      return;
    }

    confirmNitroOtaBundleIfAvailable();
  }, [appReady]);

  useEffect(() => {
    if (!appReady) {
      return;
    }

    void SplashScreen.hideAsync();
  }, [appReady]);

  useEffect(() => {
    if (!appReady) {
      return;
    }

    let cancelled = false;

    const runInitialUpdateCheck = async () => {
      try {
        const result = await checkNitroOtaForUpdates();

        if (!cancelled) {
          setNitroOtaUpdateCheck(result);
        }
      } catch {
        if (!cancelled) {
          setNitroOtaUpdateCheck(null);
        }
      }
    };

    void runInitialUpdateCheck();

    return () => {
      cancelled = true;
    };
  }, [appReady, setNitroOtaUpdateCheck]);

  const handleDismissUpdate = useCallback(() => {
    setNitroOtaUpdateCheck(null);
  }, [setNitroOtaUpdateCheck]);

  const handleApplyUpdate = useCallback(async () => {
    setUpdateBusy(true);

    try {
      const result = await checkNitroOtaForUpdates();

      if (!result?.hasUpdate || !result.isCompatible) {
        setNitroOtaUpdateCheck(null);
        return;
      }

      await downloadNitroOtaUpdate();
      reloadNitroOtaApp();
    } catch {
      // No-op. Keep prompt available so the user can retry.
    } finally {
      setUpdateBusy(false);
    }
  }, [setNitroOtaUpdateCheck]);

  const navigationTheme = useMemo<Theme>(() => {
    return {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        primary: theme.palette.accent,
        background: theme.palette.background,
        card: theme.palette.panel,
        border: theme.palette.border,
        text: theme.palette.textPrimary,
        notification: theme.palette.accentStrong,
      },
    };
  }, [theme]);

  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: theme.palette.background }]}
    >
      <KeyboardProvider>
        <SafeAreaProvider>
          <RootTabs
            navigationTheme={navigationTheme}
            theme={theme}
            updateCheck={updateCheck}
            updateBusy={updateBusy}
            onDismissUpdate={handleDismissUpdate}
            onApplyUpdate={() => {
              void handleApplyUpdate();
            }}
          />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
