import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonGridBackground } from "@/components/ui/neon-grid-background";
import { THEME_OPTIONS } from "@/constants/app-themes";
import { designTokens } from "@/constants/design-system";
import { useAppTheme } from "@/hooks/use-app-theme";
import {
  checkNitroOtaForUpdates,
  downloadNitroOtaUpdate,
  getNitroOtaSnapshot,
  reloadNitroOtaApp,
  rollbackNitroOtaToPreviousBundle,
  type NitroOtaUpdateCheck,
} from "@/lib/nitro-ota";
import {
  connectSpotify,
  disconnectSpotify,
  isSpotifyConfigured,
  isSpotifyConnected,
} from "@/lib/spotify";
import { formatWeightFromKg, getDefaultWeeklyIncrementKg } from "@/lib/weight";
import { useAppStore } from "@/store/use-app-store";
import { styles } from "./SettingsScreen.styles";

export default function SettingsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { layout, opacity } = designTokens;

  const settings = useAppStore((state) => state.settings);
  const mutating = useAppStore((state) => state.mutating);
  const exportBackup = useAppStore((state) => state.exportBackup);
  const importBackup = useAppStore((state) => state.importBackup);
  const setTheme = useAppStore((state) => state.setTheme);
  const setWeightUnit = useAppStore((state) => state.setWeightUnit);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyBusy, setSpotifyBusy] = useState(false);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyStatus, setSpotifyStatus] = useState<string | null>(null);
  const [nitroOtaSnapshot, setNitroOtaSnapshot] = useState(() =>
    getNitroOtaSnapshot()
  );
  const [nitroOtaBusy, setNitroOtaBusy] = useState(false);
  const [nitroOtaStatus, setNitroOtaStatus] = useState<string | null>(null);
  const [nitroOtaProgress, setNitroOtaProgress] = useState<number | null>(null);
  const [nitroOtaCheck, setNitroOtaCheck] =
    useState<NitroOtaUpdateCheck | null>(null);

  const spotifyConfigured = isSpotifyConfigured();

  const sampleWeight = formatWeightFromKg(100, settings.weightUnit);
  const defaultIncrement = formatWeightFromKg(
    getDefaultWeeklyIncrementKg(settings.weightUnit),
    settings.weightUnit
  );

  const refreshSpotifyStatus = useCallback(async () => {
    if (!spotifyConfigured) {
      setSpotifyConnected(false);
      setSpotifyError(null);
      setSpotifyStatus(
        "Missing EXPO_PUBLIC_SPOTIFY_CLIENT_ID. Add it to enable Spotify login."
      );
      return;
    }

    setSpotifyBusy(true);
    setSpotifyError(null);

    try {
      const connected = await isSpotifyConnected();
      setSpotifyConnected(connected);
      setSpotifyStatus(connected ? "" : "Not connected.");
    } catch (error) {
      setSpotifyConnected(false);
      setSpotifyStatus(null);
      setSpotifyError(
        error instanceof Error
          ? error.message
          : "Could not check Spotify connection."
      );
    } finally {
      setSpotifyBusy(false);
    }
  }, [spotifyConfigured]);

  useEffect(() => {
    void refreshSpotifyStatus();
  }, [refreshSpotifyStatus]);

  const refreshNitroOtaSnapshot = useCallback(() => {
    setNitroOtaSnapshot(getNitroOtaSnapshot());
  }, []);

  const handleCheckNitroOta = useCallback(async () => {
    setNitroOtaBusy(true);
    setNitroOtaStatus(null);

    try {
      const result = await checkNitroOtaForUpdates();
      refreshNitroOtaSnapshot();
      setNitroOtaCheck(result);

      if (!result) {
        setNitroOtaStatus(
          nitroOtaSnapshot.enabled
            ? "Nitro OTA check is not available on this build."
            : nitroOtaSnapshot.disabledReason ?? "Nitro OTA is not configured."
        );
        return;
      }

      if (!result.hasUpdate) {
        setNitroOtaStatus("No OTA update available.");
        return;
      }

      if (!result.isCompatible) {
        setNitroOtaStatus(
          `Update ${result.remoteVersion} is available but not compatible with app version ${nitroOtaSnapshot.binaryAppVersion}.`
        );
        return;
      }

      setNitroOtaStatus(
        `Compatible update ${result.remoteVersion} is available.`
      );
    } catch (error) {
      setNitroOtaStatus(
        error instanceof Error ? error.message : "Failed to check Nitro OTA."
      );
    } finally {
      setNitroOtaBusy(false);
    }
  }, [
    nitroOtaSnapshot.binaryAppVersion,
    nitroOtaSnapshot.disabledReason,
    nitroOtaSnapshot.enabled,
    refreshNitroOtaSnapshot,
  ]);

  const handleDownloadNitroOta = useCallback(async () => {
    if (!nitroOtaSnapshot.enabled) {
      Alert.alert(
        "Nitro OTA not configured",
        nitroOtaSnapshot.disabledReason ?? "Configure Nitro OTA first."
      );
      return;
    }

    setNitroOtaBusy(true);
    setNitroOtaProgress(0);
    setNitroOtaStatus("Checking for updates...");

    try {
      const checkResult = await checkNitroOtaForUpdates();
      setNitroOtaCheck(checkResult);

      if (!checkResult?.hasUpdate) {
        setNitroOtaStatus("No OTA update available.");
        return;
      }

      if (!checkResult.isCompatible) {
        setNitroOtaStatus(
          `Update ${checkResult.remoteVersion} is not compatible with app version ${nitroOtaSnapshot.binaryAppVersion}.`
        );
        return;
      }

      setNitroOtaStatus(`Downloading OTA ${checkResult.remoteVersion}...`);

      await downloadNitroOtaUpdate((received, total) => {
        if (total > 0) {
          setNitroOtaProgress(received / total);
          return;
        }

        setNitroOtaProgress(null);
      });

      refreshNitroOtaSnapshot();
      setNitroOtaStatus(
        `OTA ${checkResult.remoteVersion} downloaded. Restart the app to apply it.`
      );
      setNitroOtaProgress(1);

      Alert.alert(
        "Nitro OTA Ready",
        "Restart the app now to apply the update?",
        [
          {
            text: "Later",
            style: "cancel",
          },
          {
            text: "Restart",
            onPress: () => {
              reloadNitroOtaApp();
            },
          },
        ]
      );
    } catch (error) {
      setNitroOtaProgress(null);
      setNitroOtaStatus(
        error instanceof Error ? error.message : "Failed to download Nitro OTA."
      );
    } finally {
      setNitroOtaBusy(false);
    }
  }, [
    nitroOtaSnapshot.binaryAppVersion,
    nitroOtaSnapshot.disabledReason,
    nitroOtaSnapshot.enabled,
    refreshNitroOtaSnapshot,
  ]);

  const handleRollbackNitroOta = useCallback(async () => {
    if (!nitroOtaSnapshot.currentOtaVersion) {
      setNitroOtaStatus("No active OTA bundle to roll back.");
      return;
    }

    setNitroOtaBusy(true);
    setNitroOtaStatus("Rolling back OTA bundle...");

    try {
      const rolledBack = await rollbackNitroOtaToPreviousBundle();
      refreshNitroOtaSnapshot();

      if (!rolledBack) {
        setNitroOtaStatus("Rollback was not applied.");
        return;
      }

      setNitroOtaStatus("Rollback applied. Restart the app to finish.");
      Alert.alert("Rollback ready", "Restart the app now to apply rollback?", [
        {
          text: "Later",
          style: "cancel",
        },
        {
          text: "Restart",
          style: "destructive",
          onPress: () => {
            reloadNitroOtaApp();
          },
        },
      ]);
    } catch (error) {
      setNitroOtaStatus(
        error instanceof Error
          ? error.message
          : "Failed to roll back Nitro OTA."
      );
    } finally {
      setNitroOtaBusy(false);
    }
  }, [nitroOtaSnapshot.currentOtaVersion, refreshNitroOtaSnapshot]);

  const handleExportBackup = async () => {
    try {
      const uri = await exportBackup();

      if (!uri) {
        setBackupStatus("Export cancelled.");
        return;
      }

      setBackupStatus(`Backup exported: ${uri}`);
      Alert.alert(
        "Backup exported",
        "Your workouts were exported to the selected location."
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export backup.";
      Alert.alert("Export failed", message);
    }
  };

  const confirmImportBackup = async () => {
    try {
      const imported = await importBackup();

      if (!imported) {
        setBackupStatus("Import cancelled.");
        return;
      }

      setBackupStatus("Backup imported successfully.");
      Alert.alert(
        "Backup imported",
        "Your workouts and settings have been restored."
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import backup.";
      Alert.alert("Import failed", message);
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      "Import backup?",
      "Importing a backup will replace your current workouts and settings on this device.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Import",
          style: "destructive",
          onPress: () => {
            void confirmImportBackup();
          },
        },
      ]
    );
  };

  const handleConnectSpotify = async () => {
    if (!spotifyConfigured) {
      Alert.alert(
        "Spotify client ID missing",
        "Set EXPO_PUBLIC_SPOTIFY_CLIENT_ID and restart the app before connecting Spotify."
      );
      return;
    }

    setSpotifyBusy(true);
    setSpotifyError(null);

    try {
      const connected = await connectSpotify();

      if (!connected) {
        setSpotifyStatus("Spotify connection cancelled.");
        return;
      }

      setSpotifyConnected(true);
      setSpotifyStatus("Spotify connected successfully.");
    } catch (error) {
      setSpotifyConnected(false);
      setSpotifyStatus(null);
      setSpotifyError(
        error instanceof Error ? error.message : "Could not connect Spotify."
      );
    } finally {
      setSpotifyBusy(false);
    }
  };

  const handleDisconnectSpotify = async () => {
    setSpotifyBusy(true);
    setSpotifyError(null);

    try {
      await disconnectSpotify();
      setSpotifyConnected(false);
      setSpotifyStatus("Spotify disconnected.");
    } catch (error) {
      setSpotifyError(
        error instanceof Error ? error.message : "Could not disconnect Spotify."
      );
    } finally {
      setSpotifyBusy(false);
    }
  };

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
          <AppText variant="heading">Spotify</AppText>
          <AppText tone="muted">
            Connect Spotify to show your current song while an active workout
            session is running.
          </AppText>

          <View style={styles.backupActions}>
            {spotifyConnected ? (
              <NeonButton
                title={spotifyBusy ? "Working..." : "Disconnect Spotify"}
                variant="ghost"
                onPress={() => {
                  void handleDisconnectSpotify();
                }}
                disabled={spotifyBusy}
              />
            ) : (
              <NeonButton
                title={spotifyBusy ? "Working..." : "Connect Spotify"}
                onPress={() => {
                  void handleConnectSpotify();
                }}
                disabled={spotifyBusy}
              />
            )}
          </View>

          {spotifyError ? (
            <AppText tone="danger">{spotifyError}</AppText>
          ) : null}
          {!spotifyError && spotifyStatus ? (
            <AppText
              tone={
                spotifyConnected
                  ? "success"
                  : spotifyConfigured
                  ? "muted"
                  : "danger"
              }
            >
              {spotifyStatus}
            </AppText>
          ) : null}
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
          <AppText variant="heading">Nitro OTA</AppText>
          <AppText tone="muted">
            Check, download, and apply React Native Nitro OTA updates published
            from your configured GitHub branch.
          </AppText>

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
                Binary version
              </AppText>
              <AppText>{nitroOtaSnapshot.binaryAppVersion}</AppText>
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
                OTA branch
              </AppText>
              <AppText>
                {nitroOtaSnapshot.ref ??
                  (nitroOtaSnapshot.enabled ? "Unknown" : "Disabled")}
              </AppText>
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
                Active OTA
              </AppText>
              <AppText>{nitroOtaSnapshot.currentOtaVersion ?? "None"}</AppText>
            </View>
          </View>

          <View style={styles.backupActions}>
            <NeonButton
              title={nitroOtaBusy ? "Working..." : "Check for OTA Update"}
              onPress={() => {
                void handleCheckNitroOta();
              }}
              disabled={nitroOtaBusy || !nitroOtaSnapshot.enabled}
            />
            <NeonButton
              title={nitroOtaBusy ? "Working..." : "Download & Apply OTA"}
              onPress={() => {
                void handleDownloadNitroOta();
              }}
              disabled={nitroOtaBusy || !nitroOtaSnapshot.enabled}
            />
            <NeonButton
              title="Restart App"
              variant="ghost"
              onPress={reloadNitroOtaApp}
              disabled={!nitroOtaSnapshot.enabled}
            />
            <NeonButton
              title={nitroOtaBusy ? "Working..." : "Rollback OTA"}
              variant="danger"
              onPress={() => {
                void handleRollbackNitroOta();
              }}
              disabled={nitroOtaBusy || !nitroOtaSnapshot.currentOtaVersion}
            />
          </View>

          {nitroOtaProgress !== null ? (
            <AppText tone="muted">
              Download progress: {Math.round(nitroOtaProgress * 100)}%
            </AppText>
          ) : null}

          {nitroOtaCheck ? (
            <AppText
              tone={
                nitroOtaCheck.hasUpdate
                  ? nitroOtaCheck.isCompatible
                    ? "success"
                    : "danger"
                  : "muted"
              }
            >
              Latest OTA: {nitroOtaCheck.remoteVersion}
              {nitroOtaCheck.metadata?.releaseNotes
                ? ` (${nitroOtaCheck.metadata.releaseNotes})`
                : ""}
            </AppText>
          ) : null}

          {nitroOtaStatus ? (
            <AppText tone={nitroOtaSnapshot.enabled ? "muted" : "danger"}>
              {nitroOtaStatus}
            </AppText>
          ) : null}
          {!nitroOtaStatus && !nitroOtaSnapshot.enabled ? (
            <AppText tone="danger">
              {nitroOtaSnapshot.disabledReason ??
                "Nitro OTA is not configured for this build."}
            </AppText>
          ) : null}
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
            Export your current SQLite workout data as a backup file, or import
            a previously exported backup.
          </AppText>

          <View style={styles.backupActions}>
            <NeonButton
              title={mutating ? "Working..." : "Export Backup File"}
              onPress={() => {
                void handleExportBackup();
              }}
              disabled={mutating}
            />
            <NeonButton
              title={mutating ? "Working..." : "Import Backup File"}
              variant="ghost"
              onPress={handleImportBackup}
              disabled={mutating}
            />
          </View>

          {backupStatus ? <AppText tone="muted">{backupStatus}</AppText> : null}
        </View>
      </ScrollView>
    </View>
  );
}
