import type { ExerciseData } from "@/shared/workout-types";

export async function fetchExercises(): Promise<ExerciseData[]> {
  const response = await fetch("/api/exercises");
  return response.json();
}
