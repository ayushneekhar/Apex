import { Platform } from "react-native";
import { Haptics } from "react-native-nitro-haptics";

type AndroidHapticType = Parameters<typeof Haptics.performAndroidHaptics>[0];

function runHaptic({
  ios,
  android,
}: {
  ios: () => void;
  android: AndroidHapticType;
}) {
  if (Platform.OS === "android") {
    Haptics.performAndroidHaptics(android);
    return;
  }

  if (Platform.OS === "ios") {
    ios();
  }
}

export function triggerSelectionHaptic() {
  runHaptic({
    ios: () => Haptics.selection(),
    android: "segment-tick",
  });
}

export function triggerSuccessHaptic() {
  runHaptic({
    ios: () => Haptics.notification("success"),
    android: "confirm",
  });
}

export function triggerLightImpactHaptic() {
  runHaptic({
    ios: () => Haptics.impact("rigid"),
    android: "context-click",
  });
}

export function triggerLongPressHaptic() {
  runHaptic({
    ios: () => Haptics.impact("medium"),
    android: "long-press",
  });
}
