import type { ExerciseData } from "@/shared/workout-types";
import { getRotationQualityMetrics } from "@/shared/workout-analysis";

export function getOverviewMetrics(exercises: ExerciseData[]) {
  return getRotationQualityMetrics(exercises, 42);
}
