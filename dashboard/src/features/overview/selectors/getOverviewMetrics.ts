import type { ExerciseData } from "@/shared/workout-types";
import {
  get1RMProgression,
  getExerciseSummary,
} from "@/shared/workout-analysis";
import { isWithinLastDays } from "@/shared/date";

export function getOverviewMetrics(exercises: ExerciseData[]) {
  if (exercises.length === 0) return null;

  const totalVolume = exercises.reduce(
    (acc, ex) => acc + ex.weight * ex.reps,
    0,
  );

  const big3 = ["squat", "bench press", "deadlift"];
  let strengthScore = 0;
  big3.forEach((lift) => {
    const progression = get1RMProgression(exercises, lift);
    if (progression.length > 0) {
      const max1RM = Math.max(...progression.map((p) => p.estimated1RM));
      strengthScore += max1RM;
    }
  });

  const summary = getExerciseSummary(exercises);
  const recentPRsCount = summary.filter((s) =>
    isWithinLastDays(s.maxWeightDate, 30),
  ).length;

  const counts = new Map<string, number>();
  exercises.forEach((ex) => {
    counts.set(ex.name, (counts.get(ex.name) || 0) + 1);
  });

  let favoriteLift = "";
  let maxCount = 0;
  for (const [name, count] of Array.from(counts.entries())) {
    if (count > maxCount) {
      maxCount = count;
      favoriteLift = name;
    }
  }

  return {
    totalVolume,
    strengthScore: Math.round(strengthScore),
    recentPRsCount,
    favoriteLift,
  };
}
