import { getExerciseSummary } from "@/shared/workout-analysis";
import type { ExerciseData } from "@/shared/workout-types";

export function getRecentPRs(exercises: ExerciseData[]) {
  const summary = getExerciseSummary(exercises);
  return summary
    .filter((s) => s.maxWeightDate)
    .sort((a, b) => b.maxWeightDate.localeCompare(a.maxWeightDate))
    .slice(0, 5);
}
