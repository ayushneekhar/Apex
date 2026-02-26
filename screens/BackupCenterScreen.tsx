import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import { designTokens } from '@/constants/design-system';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  downloadGoogleDriveBackupBytes,
  isGoogleDriveConfigured,
  isGoogleDriveConnected,
  listGoogleDriveBackups,
  type GoogleDriveBackupFile,
  uploadDatabaseBackupToGoogleDrive,
} from '@/lib/google-drive-backups';
import { useAppStore } from '@/store/use-app-store';

import { styles } from './BackupCenterScreen.styles';

type BackupCenterScreenProps = {
  onBack: () => void;
};

function formatBackupTimestamp(value: string | null): string {
  if (!value) {
    return 'Unknown date';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function formatBackupSize(sizeBytes: number | null): string {
  if (sizeBytes === null || sizeBytes < 0) {
    return 'Unknown size';
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function BackupCenterScreen({ onBack }: BackupCenterScreenProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { layout } = designTokens;

  const mutating = useAppStore((state) => state.mutating);
  const exportBackup = useAppStore((state) => state.exportBackup);
  const importBackup = useAppStore((state) => state.importBackup);
  const importBackupFromBytes = useAppStore((state) => state.importBackupFromBytes);

  const [manualStatus, setManualStatus] = useState<string | null>(null);
  const [googleConfigured] = useState(() => isGoogleDriveConfigured());
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleListBusy, setGoogleListBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleStatus, setGoogleStatus] = useState<string | null>(null);
  const [googleBackups, setGoogleBackups] = useState<GoogleDriveBackupFile[]>([]);

  const hasBusyGoogleAction = googleBusy || googleListBusy;
  const disableManualActions = mutating || hasBusyGoogleAction;
  const disableGoogleActions = mutating || hasBusyGoogleAction;

  const googleStatusTone = useMemo(() => {
    if (googleError) {
      return 'danger' as const;
    }

    if (googleConnected && googleStatus) {
      return 'success' as const;
    }

    return 'muted' as const;
  }, [googleConnected, googleError, googleStatus]);

  const refreshGoogleDriveState = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!googleConfigured) {
        setGoogleConnected(false);
        setGoogleBackups([]);
        setGoogleError(null);
        setGoogleStatus(
          'Google Drive is not configured yet. Add your Google OAuth client IDs, then restart the app.'
        );
        return;
      }

      setGoogleListBusy(true);
      if (!options?.silent) {
        setGoogleError(null);
      }

      try {
        const connected = await isGoogleDriveConnected();
        setGoogleConnected(connected);

        if (!connected) {
          setGoogleBackups([]);
          setGoogleStatus('Google Drive is not connected.');
          return;
        }

        const backups = await listGoogleDriveBackups();
        setGoogleBackups(backups);
        setGoogleStatus(
          backups.length > 0
            ? `Found ${backups.length} Google Drive backup${backups.length === 1 ? '' : 's'}.`
            : 'Connected. No Google Drive backups found yet.'
        );
      } catch (error) {
        setGoogleError(
          error instanceof Error ? error.message : 'Could not load Google Drive backup state.'
        );
      } finally {
        setGoogleListBusy(false);
      }
    },
    [googleConfigured]
  );

  useEffect(() => {
    void refreshGoogleDriveState({ silent: true });
  }, [refreshGoogleDriveState]);

  const handleExportBackup = async () => {
    try {
      setManualStatus(null);
      const uri = await exportBackup();

      if (!uri) {
        setManualStatus('Manual export cancelled.');
        return;
      }

      setManualStatus(`Manual backup exported: ${uri}`);
      Alert.alert('Backup exported', 'Your workouts were exported to the selected location.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export backup.';
      Alert.alert('Export failed', message);
    }
  };

  const confirmImportBackup = async () => {
    try {
      setManualStatus(null);
      const imported = await importBackup();

      if (!imported) {
        setManualStatus('Manual import cancelled.');
        return;
      }

      setManualStatus('Manual backup imported successfully.');
      Alert.alert('Backup imported', 'Your workouts and settings have been restored.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import backup.';
      Alert.alert('Import failed', message);
    }
  };

  const handleImportBackup = () => {
    Alert.alert(
      'Import backup?',
      'Importing a backup will replace your current workouts and settings on this device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Import',
          style: 'destructive',
          onPress: () => {
            void confirmImportBackup();
          },
        },
      ]
    );
  };

  const handleConnectGoogleDrive = async () => {
    setGoogleBusy(true);
    setGoogleError(null);

    try {
      const connected = await connectGoogleDrive();

      if (!connected) {
        setGoogleStatus('Google Drive connection cancelled.');
        return;
      }

      setGoogleStatus('Google Drive connected.');
      await refreshGoogleDriveState({ silent: true });
    } catch (error) {
      setGoogleError(error instanceof Error ? error.message : 'Could not connect Google Drive.');
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    setGoogleBusy(true);
    setGoogleError(null);

    try {
      await disconnectGoogleDrive();
      setGoogleConnected(false);
      setGoogleBackups([]);
      setGoogleStatus('Google Drive disconnected.');
    } catch (error) {
      setGoogleError(error instanceof Error ? error.message : 'Could not disconnect Google Drive.');
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleUploadGoogleBackup = async () => {
    setGoogleBusy(true);
    setGoogleError(null);

    try {
      const uploaded = await uploadDatabaseBackupToGoogleDrive();
      setGoogleStatus(`Uploaded ${uploaded.name} to Google Drive.`);
      await refreshGoogleDriveState({ silent: true });
      Alert.alert('Google Drive backup complete', 'Your latest backup was uploaded to Google Drive.');
    } catch (error) {
      setGoogleError(error instanceof Error ? error.message : 'Failed to upload backup to Google Drive.');
    } finally {
      setGoogleBusy(false);
    }
  };

  const restoreGoogleBackup = async (file: GoogleDriveBackupFile) => {
    setGoogleBusy(true);
    setGoogleError(null);

    try {
      const bytes = await downloadGoogleDriveBackupBytes(file.id);
      await importBackupFromBytes(bytes);
      setGoogleStatus(`Restored ${file.name}.`);
      Alert.alert('Backup restored', 'Your workouts and settings have been restored from Google Drive.');
      await refreshGoogleDriveState({ silent: true });
    } catch (error) {
      setGoogleError(error instanceof Error ? error.message : 'Failed to restore Google Drive backup.');
    } finally {
      setGoogleBusy(false);
    }
  };

  const confirmRestoreGoogleBackup = (file: GoogleDriveBackupFile) => {
    Alert.alert(
      'Restore Google Drive backup?',
      `Restore ${file.name}? This will replace your current workouts and settings on this device.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: () => {
            void restoreGoogleBackup(file);
          },
        },
      ]
    );
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
          <View style={styles.heroTop}>
            <NeonButton title="Back to Settings" variant="ghost" onPress={onBack} style={styles.heroBackButton} />
          </View>
          <AppText variant="display">Backups</AppText>
          <AppText tone="muted">
            Manage manual backup files and Google Drive backups in one place.
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
          <AppText variant="heading">Manual Backup File</AppText>
          <AppText tone="muted">
            Export your current SQLite workout data to a file, or import a previously exported backup.
          </AppText>

          <View style={styles.actionStack}>
            <NeonButton
              title={disableManualActions ? 'Working...' : 'Export Backup File'}
              onPress={() => {
                void handleExportBackup();
              }}
              disabled={disableManualActions}
            />
            <NeonButton
              title={disableManualActions ? 'Working...' : 'Import Backup File'}
              variant="ghost"
              onPress={handleImportBackup}
              disabled={disableManualActions}
            />
          </View>

          {manualStatus ? <AppText tone="muted">{manualStatus}</AppText> : null}
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
          <AppText variant="heading">Google Drive Backup</AppText>
          <AppText tone="muted">
            Upload backups to your Google Drive and restore any Apex backup created from this app.
          </AppText>

          {!googleConfigured ? (
            <View
              style={[
                styles.helperBox,
                {
                  borderColor: theme.palette.border,
                  backgroundColor: theme.palette.panelSoft,
                },
              ]}
            >
              <AppText tone="danger">
                Google Drive is not configured yet for this build.
              </AppText>
              <AppText tone="muted">
                Add `EXPO_PUBLIC_GOOGLE_DRIVE_IOS_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_DRIVE_ANDROID_CLIENT_ID`,
                then restart the app.
              </AppText>
            </View>
          ) : null}

          <View style={styles.actionStack}>
            {googleConnected ? (
              <NeonButton
                title={disableGoogleActions ? 'Working...' : 'Disconnect Google Drive'}
                variant="ghost"
                onPress={() => {
                  void handleDisconnectGoogleDrive();
                }}
                disabled={disableGoogleActions}
              />
            ) : (
              <NeonButton
                title={disableGoogleActions ? 'Working...' : 'Connect Google Drive'}
                onPress={() => {
                  void handleConnectGoogleDrive();
                }}
                disabled={disableGoogleActions || !googleConfigured}
              />
            )}

            <NeonButton
              title={disableGoogleActions ? 'Working...' : 'Upload Backup To Google Drive'}
              onPress={() => {
                void handleUploadGoogleBackup();
              }}
              disabled={disableGoogleActions || !googleConfigured || !googleConnected}
            />

            <NeonButton
              title={disableGoogleActions ? 'Working...' : 'Refresh Google Backups'}
              variant="ghost"
              onPress={() => {
                void refreshGoogleDriveState();
              }}
              disabled={disableGoogleActions || !googleConfigured}
            />
          </View>

          {googleError ? (
            <AppText tone="danger">{googleError}</AppText>
          ) : googleStatus ? (
            <AppText tone={googleStatusTone}>{googleStatus}</AppText>
          ) : null}

          {googleConnected ? (
            <View style={styles.filesList}>
              {googleBackups.map((file) => (
                <View
                  key={file.id}
                  style={[
                    styles.fileRow,
                    {
                      borderColor: theme.palette.border,
                      backgroundColor: theme.palette.panelSoft,
                    },
                  ]}
                >
                  <View style={styles.fileRowTop}>
                    <View style={styles.fileMeta}>
                      <AppText variant="label" style={styles.fileName}>
                        {file.name}
                      </AppText>
                      <AppText tone="muted" variant="micro" style={styles.fileSubtext}>
                        {formatBackupTimestamp(file.modifiedTime ?? file.createdTime)} • {formatBackupSize(file.sizeBytes)}
                      </AppText>
                    </View>
                    <NeonButton
                      title="Restore"
                      variant="ghost"
                      style={styles.rowActionButton}
                      onPress={() => {
                        confirmRestoreGoogleBackup(file);
                      }}
                      disabled={disableGoogleActions}
                    />
                  </View>
                </View>
              ))}

              {googleBackups.length === 0 && !googleListBusy ? (
                <AppText tone="muted">
                  No Google Drive backups found yet. Upload your first backup to start using cloud restore.
                </AppText>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

