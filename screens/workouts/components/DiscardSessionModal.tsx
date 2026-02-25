import { Modal, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { NeonButton } from '@/components/ui/neon-button';

import type { WorkoutsScreenController } from '../hooks/use-workouts-screen-controller';
import { ErrorNotice } from './common/ErrorNotice';
import { styles } from './SessionModal.styles';

export function DiscardSessionModal({
  controller,
}: {
  controller: WorkoutsScreenController;
}) {
  const { theme } = controller;

  return (
    <Modal
      visible={controller.isDiscardSessionModalOpen}
      transparent
      animationType="fade"
      onRequestClose={controller.closeDiscardSessionModal}
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
          <AppText variant="heading">Discard Workout Session?</AppText>
          <AppText tone="muted">
            This active workout will be removed permanently. This action cannot be undone.
          </AppText>

          <ErrorNotice
            message="Discarding clears all sets logged in this active session."
            borderColor={`${theme.palette.danger}99`}
            backgroundColor={`${theme.palette.danger}1a`}
          />

          <View style={styles.actions}>
            <View style={styles.actionCell}>
              <NeonButton
                title="Keep Session"
                variant="ghost"
                onPress={controller.closeDiscardSessionModal}
                disabled={controller.mutating}
              />
            </View>
            <View style={styles.actionCell}>
              <NeonButton
                title="Discard"
                variant="danger"
                onPress={() => void controller.handleDiscardSession()}
                disabled={controller.mutating}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
