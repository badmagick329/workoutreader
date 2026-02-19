import { get1RMProgression } from "@/shared/workout-analysis";
import type { ExerciseData } from "@/shared/workout-types";

export function getStrengthScoreSeries(exercises: ExerciseData[]) {
  const big3 = ["squat", "bench press", "deadlift"];
  const progressions = big3.map((name) => ({
    name,
    data: get1RMProgression(exercises, name),
  }));

  const allDates = new Set<string>();
  progressions.forEach((p) => p.data.forEach((d) => allDates.add(d.date)));
  const sortedDates = Array.from(allDates).sort();

  const result = [];
  const currentMax = { squat: 0, "bench press": 0, deadlift: 0 };

  for (const date of sortedDates) {
    progressions.forEach((p) => {
      const entry = p.data.find((d) => d.date === date);
      if (entry) {
        const key = p.name as keyof typeof currentMax;
        if (entry.estimated1RM > currentMax[key]) {
          currentMax[key] = entry.estimated1RM;
        }
      }
    });

    const score =
      currentMax.squat + currentMax["bench press"] + currentMax.deadlift;
    if (score > 0) {
      result.push({ date, score });
    }
  }

  return result;
}
