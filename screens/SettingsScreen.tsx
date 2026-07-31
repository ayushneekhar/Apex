import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonGridBackground } from "@/components/ui/neon-grid-background";
import { THEME_OPTIONS } from "@/constants/app-themes";
import { designTokens } from "@/constants/design-system";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  checkNitroOtaForUpdates,
  clearNitroOtaStartupRecoveryStatus,
  getNitroOtaSnapshot,
  getNitroOtaStartupRecoveryStatus,
  type NitroOtaStartupRecoveryStatus,
} from "@/lib/nitro-ota";
import { formatWeightFromKg, getDefaultWeeklyIncrementKg } from "@/lib/weight";
import { useAppStore } from "@/store/use-app-store";
import BackupCenterScreen from "./BackupCenterScreen";
import { styles } from "./SettingsScreen.styles";

export default function SettingsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { layout, opacity } = designTokens;

  const settings = useAppStore((state) => state.settings);
  const workouts = useAppStore((state) => state.workouts);
  const mutating = useAppStore((state) => state.mutating);
  const restoreWorkout = useAppStore((state) => state.restoreWorkout);
  const setTheme = useAppStore((state) => state.setTheme);
  const setWeightUnit = useAppStore((state) => state.setWeightUnit);
  const setNitroOtaUpdateCheck = useAppStore(
    (state) => state.setNitroOtaUpdateCheck
  );
  const [showBackupCenter, setShowBackupCenter] = useState(false);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [nitroOtaSnapshot, setNitroOtaSnapshot] = useState(() =>
    getNitroOtaSnapshot()
  );
  const [nitroOtaStartupRecovery, setNitroOtaStartupRecovery] =
    useState<NitroOtaStartupRecoveryStatus | null>(null);

  const sampleWeight = formatWeightFromKg(100, settings.weightUnit);
  const defaultIncrement = formatWeightFromKg(
    getDefaultWeeklyIncrementKg(settings.weightUnit),
    settings.weightUnit
  );
  const archivedWorkouts = useMemo(
    () =>
      workouts
        .filter((workout) => workout.archivedAt !== null)
        .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0)),
    [workouts]
  );
  const archivedDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  useEffect(() => {
    let mounted = true;

    void getNitroOtaStartupRecoveryStatus().then((status) => {
      if (!mounted) {
        return;
      }

      setNitroOtaStartupRecovery(status);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    setUpdateBusy(true);
    setUpdateStatus(null);

    try {
      const snapshot = getNitroOtaSnapshot();
      setNitroOtaSnapshot(snapshot);

      if (!snapshot.enabled) {
        setNitroOtaUpdateCheck(null);
        setUpdateStatus("Updates are not available on this build.");
        return;
      }

      const checkResult = await checkNitroOtaForUpdates();

      if (!checkResult?.hasUpdate) {
        setNitroOtaUpdateCheck(null);
        setUpdateStatus("You’re on the latest version.");
        return;
      }

      if (!checkResult.isCompatible) {
        setNitroOtaUpdateCheck(null);
        setUpdateStatus("An update was found but is not compatible yet.");
        return;
      }

      setNitroOtaUpdateCheck(checkResult);
      setUpdateStatus(null);
    } catch (error) {
      setNitroOtaUpdateCheck(null);
      setUpdateStatus(
        error instanceof Error ? error.message : "Failed to check for updates."
      );
    } finally {
      setUpdateBusy(false);
    }
  }, [setNitroOtaUpdateCheck]);

  if (showBackupCenter) {
    return (
      <BackupCenterScreen
        onBack={() => {
          setShowBackupCenter(false);
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.palette.background,
        },
      ]}
    >
      <NeonGridBackground />

      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + layout.screenTopInset,
            paddingBottom: insets.bottom + layout.screenBottomInset,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <AppText variant="display">Training Settings</AppText>
          <AppText tone="muted">
            Configure your workout experience, including visual theme and
            default weight unit.
          </AppText>
        </View>

        <View
          style={[
            styles.card,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <AppText variant="heading">Theme</AppText>
          <AppText tone="muted">
            Pick how your training dashboard looks while keeping the same
            workout workflows.
          </AppText>

          <View style={styles.themeList}>
            {THEME_OPTIONS.map((option) => {
              const selected = settings.themeId === option.id;

              return (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    void setTheme(option.id);
                  }}
                  style={({ pressed }) => [
                    styles.themeCard,
                    {
                      borderColor: selected
                        ? theme.palette.accent
                        : theme.palette.border,
                      backgroundColor: option.palette.panel,
                      opacity: pressed ? opacity.pressedMedium : 1,
                    },
                  ]}
                >
                  <View style={styles.themeCardTop}>
                    <View
                      style={[
                        styles.themeSwatch,
                        {
                          backgroundColor: option.palette.accent,
                        },
                      ]}
                    />
                    <AppText
                      variant="label"
                      tone={selected ? "accent" : "primary"}
                    >
                      {option.name}
                    </AppText>
                  </View>
                  <AppText tone="muted">{option.punchline}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <AppText variant="heading">Weight Unit</AppText>
          <AppText tone="muted">
            Workout targets and logged session weights are converted live
            between kilograms and pounds.
          </AppText>

          <View
            style={[
              styles.segmented,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panelSoft,
              },
            ]}
          >
            {(["kg", "lb"] as const).map((unit) => {
              const selected = settings.weightUnit === unit;

              return (
                <Pressable
                  key={unit}
                  onPress={() => {
                    void setWeightUnit(unit);
                  }}
                  style={({ pressed }) => [
                    styles.segment,
                    {
                      backgroundColor: selected
                        ? theme.palette.accent
                        : "transparent",
                      opacity: pressed ? opacity.pressedSoft : 1,
                    },
                  ]}
                >
                  <AppText
                    variant="label"
                    tone={selected ? "inverse" : "muted"}
                  >
                    {unit.toUpperCase()}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.infoList}>
            <View
              style={[
                styles.infoRow,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panelSoft,
                },
              ]}
            >
              <AppText variant="micro" tone="muted">
                Sample conversion
              </AppText>
              <AppText>{sampleWeight}</AppText>
            </View>

            <View
              style={[
                styles.infoRow,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panelSoft,
                },
              ]}
            >
              <AppText variant="micro" tone="muted">
                Default weekly overload
              </AppText>
              <AppText tone="accent">{defaultIncrement}</AppText>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <AppText variant="heading">App Updates</AppText>
          <AppText tone="muted">
            Check for the latest app update.
          </AppText>

          <View style={styles.backupActions}>
            <NeonButton
              title={updateBusy ? "Checking..." : "Check for Updates"}
              onPress={() => {
                void handleCheckForUpdates();
              }}
              disabled={updateBusy}
            />
          </View>

          {updateStatus ? <AppText tone="muted">{updateStatus}</AppText> : null}
        </View>

        <View
          style={[
            styles.card,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <AppText variant="heading">Archived Templates</AppText>
          <AppText tone="muted">
            Archived workout templates stay out of your workouts list, but their
            session history remains in History.
          </AppText>

          {archivedWorkouts.length === 0 ? (
            <AppText tone="muted">No archived templates.</AppText>
          ) : (
            <View style={styles.archivedList}>
              {archivedWorkouts.map((workout) => (
                <View
                  key={workout.id}
                  style={[
                    styles.infoRow,
                    {
                      borderColor: theme.palette.border,
                      backgroundColor: theme.palette.panelSoft,
                    },
                  ]}
                >
                  <View style={styles.archivedTextWrap}>
                    <AppText variant="label">{workout.name}</AppText>
                    <AppText variant="micro" tone="muted">
                      Archived{" "}
                      {workout.archivedAt
                        ? archivedDateFormatter.format(new Date(workout.archivedAt))
                        : "recently"}
                    </AppText>
                  </View>
                  <NeonButton
                    title="Restore"
                    variant="ghost"
                    onPress={() => {
                      void restoreWorkout(workout.id);
                    }}
                    disabled={mutating}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <View
          style={[
            styles.card,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <AppText variant="heading">Backup & Restore</AppText>
          <AppText tone="muted">
            Open the backup center to manage manual backup files and Google
            Drive backups.
          </AppText>

          <View style={styles.backupActions}>
            <NeonButton
              title="Open Backup Center"
              onPress={() => {
                setShowBackupCenter(true);
              }}
            />
          </View>
        </View>

        {nitroOtaStartupRecovery ? (
          <View
            style={[
              styles.card,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panel,
              },
            ]}
          >
            <AppText variant="heading">OTA Update Failed</AppText>
            <AppText tone="muted">
              {nitroOtaStartupRecovery.otaVersion
                ? `OTA ${nitroOtaStartupRecovery.otaVersion} could not be loaded on startup.`
                : "A downloaded OTA update could not be loaded on startup."}
            </AppText>
            <AppText tone="muted">
              Nitro OTA cache was cleared automatically and the app fell back to
              the embedded bundle.
            </AppText>

            <View style={styles.backupActions}>
              <NeonButton
                title="Dismiss"
                variant="ghost"
                onPress={() => {
                  clearNitroOtaStartupRecoveryStatus();
                  setNitroOtaStartupRecovery(null);
                }}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.versionContainer}>
          <AppText variant="micro" tone="muted">
            Version {nitroOtaSnapshot.binaryAppVersion}
          </AppText>
          <AppText variant="micro" tone="muted">
            OTA {nitroOtaSnapshot.currentOtaVersion ?? "Not installed"}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}
