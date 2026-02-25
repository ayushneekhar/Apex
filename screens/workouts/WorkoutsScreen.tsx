import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeonGridBackground } from "@/components/ui/neon-grid-background";
import { designTokens } from "@/constants/design-system";

import { ActiveSessionOverlay } from "./components/ActiveSessionOverlay";
import { SavedWorkoutsSection } from "./components/SavedWorkoutsSection";
import { TrackerHeroCard } from "./components/TrackerHeroCard";
import { WorkoutBuilderPanel } from "./components/WorkoutBuilderPanel";
import { useWorkoutsScreenController } from "./hooks/use-workouts-screen-controller";
import { styles } from "./WorkoutsScreen.styles";

export default function WorkoutsScreen() {
  const controller = useWorkoutsScreenController();
  const insets = useSafeAreaInsets();
  const { layout } = designTokens;

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: controller.theme.palette.background,
        },
      ]}
    >
      <NeonGridBackground />

      <KeyboardAwareScrollView
        bottomOffset={layout.screenTopInset}
        keyboardShouldPersistTaps="handled"
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
        style={styles.keyboardRoot}
      >
        {!controller.moveTrackerCardToBottom ? (
          <TrackerHeroCard controller={controller} />
        ) : null}

        {controller.isComposerOpen ? (
          <WorkoutBuilderPanel controller={controller} />
        ) : null}

        <SavedWorkoutsSection controller={controller} />

        {controller.moveTrackerCardToBottom ? (
          <TrackerHeroCard controller={controller} />
        ) : null}
      </KeyboardAwareScrollView>

      <ActiveSessionOverlay controller={controller} insets={insets} />
    </View>
  );
}
