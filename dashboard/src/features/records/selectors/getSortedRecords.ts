import { getExerciseSummary } from "@/shared/workout-analysis";
import type { ExerciseData } from "@/shared/workout-types";

export function getSortedRecords(
  exercises: ExerciseData[],
  sortBy: "date" | "name",
) {
  const summary = getExerciseSummary(exercises);

  return summary.sort((a, b) => {
    if (sortBy === "date") {
      if (!a.maxWeightDate) return 1;
      if (!b.maxWeightDate) return -1;
      return b.maxWeightDate.localeCompare(a.maxWeightDate);
    }
    return a.name.localeCompare(b.name);
  });
}
