import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonGridBackground } from '@/components/ui/neon-grid-background';
import { THEME_OPTIONS } from '@/constants/app-themes';
import { designTokens } from '@/constants/design-system';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatWeightFromKg, getDefaultWeeklyIncrementKg } from '@/lib/weight';
import { useAppStore } from '@/store/use-app-store';
import { styles } from './SettingsScreen.styles';

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

  const sampleWeight = formatWeightFromKg(100, settings.weightUnit);
  const defaultIncrement = formatWeightFromKg(
    getDefaultWeeklyIncrementKg(settings.weightUnit),
    settings.weightUnit
  );

  const handleExportBackup = async () => {
    try {
      const uri = await exportBackup();

      if (!uri) {
        setBackupStatus('Export cancelled.');
        return;
      }

      setBackupStatus(`Backup exported: ${uri}`);
      Alert.alert('Backup exported', 'Your workouts were exported to the selected location.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export backup.';
      Alert.alert('Export failed', message);
    }
  };

  const confirmImportBackup = async () => {
    try {
      const imported = await importBackup();

      if (!imported) {
        setBackupStatus('Import cancelled.');
        return;
      }

      setBackupStatus('Backup imported successfully.');
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

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.palette.background,
        },
      ]}>
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
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.hero,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}>
          <AppText variant="display">Training Settings</AppText>
          <AppText tone="muted">
            Configure your workout experience, including visual theme and default weight unit.
          </AppText>
        </View>

        <View
          style={[
            styles.card,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}>
          <AppText variant="heading">Theme</AppText>
          <AppText tone="muted">
            Pick how your training dashboard looks while keeping the same workout workflows.
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
                      borderColor: selected ? theme.palette.accent : theme.palette.border,
                      backgroundColor: option.palette.panel,
                      opacity: pressed ? opacity.pressedMedium : 1,
                    },
                  ]}>
                  <View style={styles.themeCardTop}>
                    <View
                      style={[
                        styles.themeSwatch,
                        {
                          backgroundColor: option.palette.accent,
                        },
                      ]}
                    />
                    <AppText variant="label" tone={selected ? 'accent' : 'primary'}>
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
          ]}>
          <AppText variant="heading">Weight Unit</AppText>
          <AppText tone="muted">
            Workout targets and logged session weights are converted live between kilograms and
            pounds.
          </AppText>

          <View
            style={[
              styles.segmented,
              {
                borderColor: theme.palette.border,
                backgroundColor: theme.palette.panelSoft,
              },
            ]}>
            {(['kg', 'lb'] as const).map((unit) => {
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
                      backgroundColor: selected ? theme.palette.accent : 'transparent',
                      opacity: pressed ? opacity.pressedSoft : 1,
                    },
                  ]}>
                  <AppText variant="label" tone={selected ? 'inverse' : 'muted'}>
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
              ]}>
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
              ]}>
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
          ]}>
          <AppText variant="heading">Backup & Restore</AppText>
          <AppText tone="muted">
            Export your current SQLite workout data as a backup file, or import a previously
            exported backup.
          </AppText>

          <View style={styles.backupActions}>
            <NeonButton
              title={mutating ? 'Working...' : 'Export Backup File'}
              onPress={() => {
                void handleExportBackup();
              }}
              disabled={mutating}
            />
            <NeonButton
              title={mutating ? 'Working...' : 'Import Backup File'}
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
