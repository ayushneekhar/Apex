import { Haptics } from "react-native-nitro-haptics";

// Note: Haptics.performAndroidHaptics is intentionally unused. Its native
// implementation calls performHapticFeedback on a freshly constructed View that
// is never attached to a window, which Android silently ignores, so it never
// produces feedback. impact/notification/selection drive the Vibrator service
// directly and work on both platforms.

export function triggerSelectionHaptic() {
  Haptics.selection();
}

export function triggerSuccessHaptic() {
  Haptics.notification("success");
}

export function triggerLightImpactHaptic() {
  Haptics.impact("rigid");
}

export function triggerMediumImpactHaptic() {
  Haptics.impact("medium");
}

export function triggerLongPressHaptic() {
  Haptics.impact("medium");
}
