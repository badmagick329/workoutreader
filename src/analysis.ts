import { Exercise } from "./exercise";

/**
 * Get all sets for a specific exercise, sorted by date
 */
export function getExerciseHistory(
  exercises: Exercise[],
  exerciseName: string
): Exercise[] {
  return exercises
    .filter((e) => e.name === exerciseName)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get max weight per workout session for an exercise
 */
export function getMaxWeightProgression(
  exercises: Exercise[],
  exerciseName: string
): Array<{ date: string; weight: number }> {
  const history = getExerciseHistory(exercises, exerciseName);
  const sessionMap = new Map<string, number>();

  for (const ex of history) {
    const currentMax = sessionMap.get(ex.date) ?? 0;
    if (ex.weight > currentMax) {
      sessionMap.set(ex.date, ex.weight);
    }
  }

  return Array.from(sessionMap.entries())
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate estimated 1RM using Epley formula
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/**
 * Get max estimated 1RM per workout session for an exercise
 */
export function get1RMProgression(
  exercises: Exercise[],
  exerciseName: string
): Array<{ date: string; estimated1RM: number }> {
  const history = getExerciseHistory(exercises, exerciseName);
  const sessionMap = new Map<string, number>();

  for (const ex of history) {
    const estimate = calculate1RM(ex.weight, ex.reps);
    const currentMax = sessionMap.get(ex.date) ?? 0;
    if (estimate > currentMax) {
      sessionMap.set(ex.date, estimate);
    }
  }

  return Array.from(sessionMap.entries())
    .map(([date, estimated1RM]) => ({ date, estimated1RM }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get total volume per session (grouped by date and exercise)
 */
export function getVolumePerSession(
  exercises: Exercise[]
): Map<string, Array<{ date: string; exercise: string; volume: number }>> {
  const grouped = new Map<
    string,
    Array<{ date: string; exercise: string; volume: number }>
  >();

  for (const ex of exercises) {
    const key = `${ex.date}:${ex.name}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    const volume = ex.weight * ex.reps;
    const existing = grouped.get(key)!;
    const entry = existing.find(
      (e) => e.date === ex.date && e.exercise === ex.name
    );

    if (entry) {
      entry.volume += volume;
    } else {
      existing.push({ date: ex.date, exercise: ex.name, volume });
    }
  }

  return grouped;
}

/**
 * Check if an exercise is a bodyweight exercise (max weight <= 1kg)
 */
export function isBodyweightExercise(
  exercises: Exercise[],
  exerciseName: string
): boolean {
  const history = getExerciseHistory(exercises, exerciseName);
  if (history.length === 0) return false;

  // If ANY set has weight > 1, it's not purely bodyweight
  const maxWeight = Math.max(...history.map((e) => e.weight));
  return maxWeight <= 1;
}

/**
 * Get max reps per workout session for an exercise
 */
export function getMaxRepsProgression(
  exercises: Exercise[],
  exerciseName: string
): Array<{ date: string; reps: number }> {
  const history = getExerciseHistory(exercises, exerciseName);
  const sessionMap = new Map<string, number>();

  for (const ex of history) {
    const currentMax = sessionMap.get(ex.date) ?? 0;
    if (ex.reps > currentMax) {
      sessionMap.set(ex.date, ex.reps);
    }
  }

  return Array.from(sessionMap.entries())
    .map(([date, reps]) => ({ date, reps }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get total reps per workout session for an exercise
 */
export function getTotalRepsProgression(
  exercises: Exercise[],
  exerciseName: string
): Array<{ date: string; totalReps: number }> {
  const history = getExerciseHistory(exercises, exerciseName);
  const sessionMap = new Map<string, number>();

  for (const ex of history) {
    const currentTotal = sessionMap.get(ex.date) ?? 0;
    sessionMap.set(ex.date, currentTotal + ex.reps);
  }

  return Array.from(sessionMap.entries())
    .map(([date, totalReps]) => ({ date, totalReps }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get personal records for an exercise
 */
export function getPRs(
  exercises: Exercise[],
  exerciseName: string
): {
  maxWeight: { weight: number; date: string };
  max1RM: {
    estimated1RM: number;
    weight: number;
    reps: number;
    date: string;
  };
  maxReps: { reps: number; weight: number; date: string };
} {
  const history = getExerciseHistory(exercises, exerciseName);

  let maxWeight = { weight: 0, date: "" };
  let max1RM = { estimated1RM: 0, weight: 0, reps: 0, date: "" };
  let maxReps = { reps: 0, weight: 0, date: "" };

  for (const ex of history) {
    // Track max weight
    if (ex.weight > maxWeight.weight) {
      maxWeight = { weight: ex.weight, date: ex.date };
    }

    // Track max 1RM
    const estimate = calculate1RM(ex.weight, ex.reps);
    if (estimate > max1RM.estimated1RM) {
      max1RM = {
        estimated1RM: estimate,
        weight: ex.weight,
        reps: ex.reps,
        date: ex.date,
      };
    }

    // Track max reps
    if (ex.reps > maxReps.reps) {
      maxReps = { reps: ex.reps, weight: ex.weight, date: ex.date };
    }
  }

  return { maxWeight, max1RM, maxReps };
}

/**
 * Get summary of all exercises
 */
export function getExerciseSummary(exercises: Exercise[]): Array<{
  name: string;
  maxWeight: number;
  maxWeightDate: string;
  lastEstimated1RM: number;
  lastTrainedDate: string;
}> {
  // Get unique exercise names
  const exerciseNames = Array.from(new Set(exercises.map((e) => e.name)));

  const summaries = exerciseNames.map((name) => {
    const history = getExerciseHistory(exercises, name);
    const prs = getPRs(exercises, name);

    // Get last session
    const lastSession = history[history.length - 1];
    if (!lastSession) {
      return {
        name,
        maxWeight: 0,
        maxWeightDate: "",
        lastEstimated1RM: 0,
        lastTrainedDate: "",
      };
    }

    const lastEstimated1RM = calculate1RM(lastSession.weight, lastSession.reps);

    return {
      name,
      maxWeight: prs.maxWeight.weight,
      maxWeightDate: prs.maxWeight.date,
      lastEstimated1RM,
      lastTrainedDate: lastSession.date,
    };
  });

  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}
