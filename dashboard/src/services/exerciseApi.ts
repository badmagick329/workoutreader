import type { ExerciseData } from "@/shared/workout-types";
export type { Workout } from "../../../src/workout-log";
export type Snapshot<T> = { value: T; revision: string };
export type ExerciseSettings = { archivedExerciseNames: string[] };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function request<T>(path: string, method = "GET", body?: unknown, revision?: string): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method, cache: "no-store",
    headers: { "Content-Type": "application/json", ...(revision === undefined ? {} : { "If-Match": revision }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new ApiError(response.status, await response.text());
  return response.json();
}
export const fetchExercises = () => request<ExerciseData[]>("exercises");
export const fetchWorkoutInput = () => request<Snapshot<string>>("workout-input");
export const saveWorkoutInput = (text: string, revision: string) => request<Snapshot<string>>("workout-input", "PUT", { text }, revision);
export const fetchExerciseSettings = () => request<Snapshot<ExerciseSettings>>("exercise-settings");
export const saveExerciseSettings = (archivedExerciseNames: string[], revision: string) => request<Snapshot<ExerciseSettings>>("exercise-settings", "PUT", { archivedExerciseNames }, revision);
