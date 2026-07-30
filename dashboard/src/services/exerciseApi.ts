import type { ExerciseData } from "@/shared/workout-types";

export async function fetchExercises(): Promise<ExerciseData[]> {
  const response = await fetch("/api/exercises");
  if (!response.ok) throw new Error(`Exercise API returned ${response.status}`);
  return (await response.json()) as ExerciseData[];
}

export async function fetchWorkoutInput(): Promise<string> {
  const response = await fetch("/api/workout-input");
  if (!response.ok) throw new Error(`Workout input API returned ${response.status}`);
  return response.text();
}

export async function saveWorkoutInput(text: string): Promise<void> {
  const response = await fetch("/api/workout-input", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error((await response.text()) || "Workout input could not be saved");
}
