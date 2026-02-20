import { getRotationQualityMetrics } from "@/shared/workout-analysis";
import type { ExerciseData } from "@/shared/workout-types";

export function getStrengthScoreSeries(exercises: ExerciseData[]) {
  const sortedDates = Array.from(
    new Set(exercises.map((exercise) => exercise.date)),
  ).sort();
  const result: Array<{ date: string; score: number }> = [];

  for (const date of sortedDates) {
    const metrics = getRotationQualityMetrics(exercises, 42, date);
    if (!metrics || metrics.currentSessions === 0) {
      continue;
    }

    result.push({ date, score: metrics.qualityScore });
  }

  return result;
}
