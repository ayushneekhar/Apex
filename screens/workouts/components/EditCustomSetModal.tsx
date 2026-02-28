import { Pressable, Modal, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';

import { WEIGHT_KEYBOARD_TYPE } from '../constants';
import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import type { CustomWeightApplyScope } from '../types';
import { ErrorNotice } from './common/ErrorNotice';
import { styles } from './SessionModal.styles';

const weightApplyScopeOptions: {
  label: string;
  description: string;
  value: CustomWeightApplyScope;
}[] = [
  { label: 'This', description: 'current set only', value: 'current' },
  { label: 'This + next', description: 'remaining sets', value: 'remaining' },
  { label: 'Every set', description: 'all sets in exercise', value: 'all' },
];

export function EditCustomSetModal({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  const { theme, settings } = controller;

  return (
    <Modal
      visible={controller.customSetId !== null}
      transparent
      animationType="fade"
      onRequestClose={controller.closeCustomSetModal}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.panel,
            },
          ]}
        >
          <AppText variant="heading">
            {controller.customSetEditMode === 'reps' ? 'Edit Reps' : 'Edit Weight'}
          </AppText>
          <AppText tone="muted">
            {controller.customSetEditMode === 'reps'
              ? 'Set a custom rep count for this set.'
              : 'Adjust the working weight for this set.'}
          </AppText>

          {controller.customSetEditMode === 'reps' ? (
            <NeonInput
              label="Reps"
              keyboardType="number-pad"
              value={controller.customSetRepsInput}
              onChangeText={(value) => {
                controller.setCustomSetRepsInput(value);
                controller.clearCustomSetError();
              }}
            />
          ) : (
            <>
              <NeonInput
                label="Weight"
                keyboardType={WEIGHT_KEYBOARD_TYPE}
                value={controller.customSetWeightInput}
                onChangeText={(value) => {
                  controller.setCustomSetWeightInput(value);
                  controller.clearCustomSetError();
                }}
                suffix={settings.weightUnit}
              />

              <View style={styles.scopeTabs}>
                {weightApplyScopeOptions.map((option) => {
                  const isSelected = option.value === controller.customWeightApplyScope;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => controller.setCustomWeightApplyScope(option.value)}
                      style={[
                        styles.scopeTab,
                        {
                          borderColor: isSelected ? theme.palette.accent : theme.palette.border,
                          backgroundColor: isSelected ? theme.palette.accent : theme.palette.panelSoft,
                        },
                      ]}
                    >
                      <AppText
                        variant="label"
                        style={{ color: isSelected ? theme.palette.accentContrast : theme.palette.textMuted }}
                      >
                        {option.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <AppText variant="micro" tone="muted" style={styles.scopeHint}>
                {
                  weightApplyScopeOptions.find(
                    (option) => option.value === controller.customWeightApplyScope
                  )?.description
                }
              </AppText>
            </>
          )}

          {controller.customSetError ? <ErrorNotice message={controller.customSetError} /> : null}

          <View style={styles.actions}>
            <View style={styles.actionCell}>
              <NeonButton title="Cancel" variant="ghost" onPress={controller.closeCustomSetModal} />
            </View>
            <View style={styles.actionCell}>
              <NeonButton title="Save" onPress={() => void controller.saveCustomSetValues()} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
