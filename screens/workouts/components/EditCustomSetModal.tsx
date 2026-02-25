import { Modal, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';
import { NeonInput } from '@/components/ui/neon-input';

import { WEIGHT_KEYBOARD_TYPE } from '../constants';
import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import { ErrorNotice } from './common/ErrorNotice';
import { styles } from './SessionModal.styles';

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
