import { parseYYMMDD } from "@/shared/date";
import type { ExerciseData } from "@/shared/workout-types";

export function getWeeklyVolumeData(exercises: ExerciseData[]) {
  const weeks = new Map<string, number>();

  exercises.forEach((ex) => {
    const d = parseYYMMDD(ex.date);
    const dayOfWeek = d.getDay() || 7;
    d.setDate(d.getDate() - dayOfWeek + 1);
    const weekStr = d.toISOString().split("T")[0];
    weeks.set(weekStr, (weeks.get(weekStr) || 0) + ex.weight * ex.reps);
  });

  return Array.from(weeks.entries())
    .map(([date, volume]) => ({ date, volume }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);
}
