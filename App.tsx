import 'react-native-reanimated';

import {
  Unbounded_400Regular,
  Unbounded_500Medium,
  Unbounded_700Bold,
  useFonts,
} from '@expo-google-fonts/unbounded';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppTheme } from '@/constants/app-themes';
import { useAppTheme } from '@/hooks/use-app-theme';
import AnalyticsScreen from '@/screens/AnalyticsScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import WorkoutsScreen from '@/screens/WorkoutsScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import { useAppStore } from '@/store/use-app-store';

void SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();

function RootTabs({ navigationTheme, theme }: { navigationTheme: Theme; theme: AppTheme }) {
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        initialRouteName="Workouts"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.palette.accent,
          tabBarInactiveTintColor: theme.palette.textMuted,
          tabBarStyle: {
            backgroundColor: theme.palette.panel,
            borderTopColor: theme.palette.border,
            borderTopWidth: 1,
            height: 56 + insets.bottom,
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom, 6),
          },
          tabBarLabelStyle: {
            fontFamily: 'Unbounded_500Medium',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 0.7,
            marginBottom: 2,
          },
        }}>
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
            tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
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
  );
}

export default function App() {
  const theme = useAppTheme();
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

  useEffect(() => {
    if (fontsLoaded && hydrated) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hydrated]);

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

  if (!fontsLoaded || !hydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <RootTabs navigationTheme={navigationTheme} theme={theme} />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
