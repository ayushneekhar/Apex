import "react-native-reanimated";

// Deep imports: the package barrels pull every font weight / icon set into the
// bundle's assets, which ships ~7MB of unused fonts with every OTA update.
import { Unbounded_400Regular } from "@expo-google-fonts/unbounded/400Regular";
import { Unbounded_500Medium } from "@expo-google-fonts/unbounded/500Medium";
import { Unbounded_700Bold } from "@expo-google-fonts/unbounded/700Bold";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  DarkTheme,
  NavigationContainer,
  type Theme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { BlurTargetView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";
import { AppState, Pressable, View } from "react-native";
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
  configureRestNotifications,
  syncRestCompleteNotification,
} from "@/lib/rest-notifications";
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
import SessionDetailScreen from "@/screens/SessionDetailScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import WorkoutTemplateCreatorScreen from "@/screens/WorkoutTemplateCreatorScreen";
import WorkoutTemplateEditorScreen from "@/screens/WorkoutTemplateEditorScreen";
import WorkoutsScreen from "@/screens/WorkoutsScreen";
import { useAppStore } from "@/store/use-app-store";
import type { RootStackParamList } from "@/types/navigation";

void SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();

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
  theme,
  updateCheck,
  updateBusy,
  onDismissUpdate,
  onApplyUpdate,
}: {
  theme: AppTheme;
  updateCheck: NitroOtaUpdateCheck | null;
  updateBusy: boolean;
  onDismissUpdate: () => void;
  onApplyUpdate: () => void;
}) {
  const insets = useSafeAreaInsets();
  const showUpdatePrompt = Boolean(updateCheck?.hasUpdate && updateCheck.isCompatible);
  // Each scene is its own blur target; the tab bar blurs whichever one is focused.
  // The bar can't sit inside the view it blurs, so the whole navigator can't be the target.
  const blurTargets = useMemo(
    () => new Map<string, RefObject<View | null>>(
        APP_TABS.map((tab) => [tab.name, createRef<View>()])
      ),
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.background }}>
      <Tab.Navigator
        initialRouteName="Workouts"
        detachInactiveScreens={false}
        screenLayout={({ children, route }) => (
          <BlurTargetView ref={blurTargets.get(route.name)} style={styles.root}>
            {children}
          </BlurTargetView>
        )}
        screenOptions={({ route }) =>
          createTabScreenOptions(theme, insets, blurTargets.get(route.name))
        }
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
    </View>
  );
}

export default function App() {
  const theme = useAppTheme();
  const bootstrapError = useAppStore((state) => state.error);
  const hydrated = useAppStore((state) => state.hydrated);
  const bootstrap = useAppStore((state) => state.bootstrap);
  const activeRestTimer = useAppStore(
    (state) => state.activeSession?.restTimer ?? null
  );
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
    void configureRestNotifications().catch(() => undefined);
  }, []);

  useEffect(() => {
    const syncNotification = () => {
      if (activeRestTimer?.endsAt && activeRestTimer.endsAt > Date.now()) {
        void syncRestCompleteNotification(activeRestTimer).catch(() => undefined);
      }
    };

    syncNotification();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        syncNotification();
      }
    });

    return () => subscription.remove();
  }, [activeRestTimer]);

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
          <NavigationContainer theme={navigationTheme}>
            <RootStack.Navigator
              initialRouteName="Tabs"
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: theme.palette.background,
                },
              }}
            >
              <RootStack.Screen name="Tabs">
                {() => (
                  <RootTabs
                    theme={theme}
                    updateCheck={updateCheck}
                    updateBusy={updateBusy}
                    onDismissUpdate={handleDismissUpdate}
                    onApplyUpdate={() => {
                      void handleApplyUpdate();
                    }}
                  />
                )}
              </RootStack.Screen>
              <RootStack.Screen
                name="SessionDetails"
                component={SessionDetailScreen}
              />
              <RootStack.Screen
                name="WorkoutTemplateCreator"
                component={WorkoutTemplateCreatorScreen}
              />
              <RootStack.Screen
                name="WorkoutTemplateEditor"
                component={WorkoutTemplateEditorScreen}
              />
            </RootStack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
