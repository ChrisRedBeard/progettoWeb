export type TrainingExercise = {
  id: string;
  title: string;
  description: string | null;
  analysisType: "NONE" | "CATALOG" | "GENERIC";
  analysisKey: string | null;
  sets: number;
  reps: number;
  tempo: string | null;
  restSeconds: number;
  countLabel: string;
};

export function toTrainingExercise(input: Omit<TrainingExercise, "countLabel">): TrainingExercise {
  return {
    ...input,
    countLabel: input.analysisKey === "plank" ? "secondi" : "ripetizioni",
  };
}
