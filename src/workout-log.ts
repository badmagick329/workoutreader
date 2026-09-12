import { Exercise } from "./exercise";
import { splitLinesByDate, validateDate } from "./parser";

export type Workout = { date: string; lines: string[]; targets?: string[] };

/** Storage and analytics share date grouping so repeated dates cannot hide sets. */
export function parseWorkouts(text: string): Workout[] {
  return [...splitLinesByDate(text)].map(([date, lines]) => ({ date, lines }));
}

export function parseExercises(text: string): Exercise[] {
  let date = "";
  return text.split(/\r?\n/).flatMap((raw, index) => {
    const line = raw.trim();
    if (!line) return [];
    try {
      if (/^\d{6}$/.test(line)) { validateDate(line); date = line; return []; }
      if (!date) throw new Error("Workout text found without a date");
      return Exercise.fromLine(date, line);
    } catch (error) {
      throw new Error(`Line ${index + 1}: ${(error as Error).message}`);
    }
  });
}

export function validateWorkout(value: unknown): asserts value is Workout {
  if (!value || typeof value !== "object") throw new Error("Workout must be an object");
  const workout = value as Workout;
  if (typeof workout.date !== "string") throw new Error("Workout date is required");
  validateDate(workout.date);
  for (const lines of [workout.lines, workout.targets ?? []]) {
    if (!Array.isArray(lines) || lines.some(line => typeof line !== "string" || /[\r\n]/.test(line) || /^\d{6}$/.test(line.trim()))) throw new Error("Exercises must be individual text lines");
    parseExercises([workout.date, ...lines].join("\n"));
  }
}

export function serializeWorkouts(workouts: Workout[]): string {
  return workouts.map(workout => [workout.date, ...workout.lines].join("\n")).join("\n\n") + "\n";
}
