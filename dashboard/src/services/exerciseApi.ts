import type { ExerciseData } from "@/shared/workout-types";

export async function fetchExercises(): Promise<ExerciseData[]> {
  const response = await fetch("/api/exercises");
  if (!response.ok) throw new Error(`Exercise API returned ${response.status}`);
  return (await response.json()) as ExerciseData[];
}
