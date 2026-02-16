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
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { createTabScreenOptions, styles } from "@/App.styles";
import type { AppTheme } from "@/constants/app-themes";
import { useAppTheme } from "@/hooks/use-app-theme";
import AnalyticsScreen from "@/screens/AnalyticsScreen";
import HistoryScreen from "@/screens/HistoryScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import WorkoutsScreen from "@/screens/WorkoutsScreen";
import { useAppStore } from "@/store/use-app-store";

void SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();

function RootTabs({
  navigationTheme,
  theme,
}: {
  navigationTheme: Theme;
  theme: AppTheme;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.background }}>
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          initialRouteName="Workouts"
          detachInactiveScreens={false}
          screenOptions={createTabScreenOptions(theme, insets)}
        >
          <Tab.Screen
            name="Workouts"
            component={WorkoutsScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="barbell-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="History"
            component={HistoryScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="time-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="stats-chart-outline" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="settings-outline" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
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

  const [fontsLoaded] = useFonts({
    Unbounded_400Regular,
    Unbounded_500Medium,
    Unbounded_700Bold,
  });

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const appReady = fontsLoaded && (hydrated || Boolean(bootstrapError));

  useEffect(() => {
    if (!appReady) {
      return;
    }

    void SplashScreen.hideAsync();
  }, [appReady]);

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
          <RootTabs navigationTheme={navigationTheme} theme={theme} />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
