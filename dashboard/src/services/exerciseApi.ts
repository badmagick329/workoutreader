import type { ExerciseData } from "@/shared/workout-types";

export type ExerciseSettings = {
  archivedExerciseNames: string[];
};

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

export type Workout = { date: string; lines: string[] };

async function responseError(response: Response): Promise<never> {
  throw new Error((await response.text()) || "Request failed");
}

export async function fetchWorkouts(): Promise<Workout[]> {
  const response = await fetch("/api/workouts");
  if (!response.ok) return responseError(response);
  return response.json() as Promise<Workout[]>;
}

export async function fetchWorkoutDraft(): Promise<Workout | null> {
  const response = await fetch("/api/workout-draft");
  if (!response.ok) return responseError(response);
  return response.json() as Promise<Workout | null>;
}

export async function saveWorkoutDraft(workout: Workout): Promise<void> {
  const response = await fetch("/api/workout-draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(workout) });
  if (!response.ok) return responseError(response);
}

export async function clearWorkoutDraft(): Promise<void> {
  const response = await fetch("/api/workout-draft", { method: "DELETE" });
  if (!response.ok) return responseError(response);
}

export async function finishWorkoutDraft(conflict?: "merge" | "overwrite"): Promise<{ conflict: boolean }> {
  const response = await fetch("/api/workout-draft/finish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conflict }) });
  if (response.status === 409) return { conflict: true };
  if (!response.ok) return responseError(response);
  return { conflict: false };
}

export async function fetchNextWorkout(): Promise<Workout | null> {
  const response = await fetch("/api/next-workout");
  if (!response.ok) return responseError(response);
  return response.json() as Promise<Workout | null>;
}

export async function saveNextWorkout(workout: Workout): Promise<void> {
  const response = await fetch("/api/next-workout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(workout) });
  if (!response.ok) return responseError(response);
}

export async function clearNextWorkout(): Promise<void> {
  const response = await fetch("/api/next-workout", { method: "DELETE" });
  if (!response.ok) return responseError(response);
}

export async function fetchExerciseSettings(): Promise<ExerciseSettings> {
  const response = await fetch("/api/exercise-settings");
  if (!response.ok) throw new Error(`Exercise settings API returned ${response.status}`);
  return (await response.json()) as ExerciseSettings;
}

export async function saveExerciseSettings(
  archivedExerciseNames: string[],
): Promise<ExerciseSettings> {
  const response = await fetch("/api/exercise-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archivedExerciseNames }),
  });
  if (!response.ok) throw new Error(`Exercise settings API returned ${response.status}`);
  return (await response.json()) as ExerciseSettings;
}
