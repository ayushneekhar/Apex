import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';

type NitroHaptics = {
  impact: (style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid') => void;
  notification: (type: 'success' | 'warning' | 'error') => void;
  selection: () => void;
  performAndroidHaptics: (
    type:
      | 'confirm'
      | 'reject'
      | 'gesture-start'
      | 'gesture-end'
      | 'toggle-on'
      | 'toggle-off'
      | 'clock-tick'
      | 'context-click'
      | 'drag-start'
      | 'keyboard-tap'
      | 'keyboard-press'
      | 'keyboard-release'
      | 'long-press'
      | 'virtual-key'
      | 'virtual-key-release'
      | 'no-haptics'
      | 'segment-tick'
      | 'segment-frequent-tick'
      | 'text-handle-move'
  ) => void;
};

let didTryLoadNitro = false;
let cachedNitroHaptics: NitroHaptics | null = null;

function getNitroHaptics(): NitroHaptics | null {
  if (Platform.OS === 'web') {
    return null;
  }

  if (didTryLoadNitro) {
    return cachedNitroHaptics;
  }

  didTryLoadNitro = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('react-native-nitro-haptics') as {
      Haptics?: NitroHaptics;
    };
    cachedNitroHaptics = module?.Haptics ?? null;
  } catch {
    cachedNitroHaptics = null;
  }

  return cachedNitroHaptics;
}

export function triggerSelectionHaptic() {
  const nitro = getNitroHaptics();

  if (nitro) {
    if (Platform.OS === 'android') {
      nitro.performAndroidHaptics('segment-tick');
      return;
    }

    nitro.selection();
    return;
  }

  void ExpoHaptics.selectionAsync();
}

export function triggerSuccessHaptic() {
  const nitro = getNitroHaptics();

  if (nitro) {
    if (Platform.OS === 'android') {
      nitro.performAndroidHaptics('confirm');
      return;
    }

    nitro.notification('success');
    return;
  }

  void ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
}
