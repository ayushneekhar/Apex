export type RootStackParamList = {
  Tabs: undefined;
  SessionDetails: {
    workoutId: string;
    sessionId: string;
  };
  WorkoutSummary: {
    workoutId: string;
    sessionId: string;
  };
  WorkoutTemplateCreator: undefined;
  WorkoutTemplateEditor: {
    workoutId: string;
  };
};
