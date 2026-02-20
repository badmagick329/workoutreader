import { Exercise } from "./exercise";

/**
 * Get all sets for a specific exercise, sorted by date
 */
export function getExerciseHistory(
  exercises: Exercise[],
  exerciseName: string,
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
  exerciseName: string,
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
  exerciseName: string,
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
  exercises: Exercise[],
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
      (e) => e.date === ex.date && e.exercise === ex.name,
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
  exerciseName: string,
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
  exerciseName: string,
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
  exerciseName: string,
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
  exerciseName: string,
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

type ExerciseWindowStats = {
  sessions: number;
  volume: number;
  bestWeight: number;
  best1RM: number;
  bestReps: number;
  setCount: number;
};

export type RotationQualityMetrics = {
  anchorDate: string;
  windowDays: number;
  qualityScore: number;
  progressionScore: number;
  consistencyScore: number;
  balanceScore: number;
  totalVolume: number;
  currentBlockVolume: number;
  previousBlockVolume: number;
  blockVolumeDelta: number;
  activeExercisesCount: number;
  improvingCount: number;
  stableCount: number;
  decliningCount: number;
  emergingCount: number;
  phasedOutCount: number;
  currentSessions: number;
  previousSessions: number;
  sessionsPerWeek: number;
  favoriteLift: string;
};

function parseYYMMDDToUTC(dateStr: string): Date {
  const year = 2000 + Number.parseInt(dateStr.slice(0, 2), 10);
  const month = Number.parseInt(dateStr.slice(2, 4), 10) - 1;
  const day = Number.parseInt(dateStr.slice(4, 6), 10);
  return new Date(Date.UTC(year, month, day));
}

function formatUTCToYYMMDD(date: Date): string {
  const year = date.getUTCFullYear() % 100;
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${String(year).padStart(2, "0")}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

function addDaysUTC(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getUniqueSessionCount(exercises: Exercise[]): number {
  return new Set(exercises.map((exercise) => exercise.date)).size;
}

function getFavoriteLift(exercises: Exercise[]): string {
  if (exercises.length === 0) return "";

  const counts = new Map<string, number>();
  for (const exercise of exercises) {
    counts.set(exercise.name, (counts.get(exercise.name) ?? 0) + 1);
  }

  let favoriteLift = "";
  let maxCount = 0;
  for (const [name, count] of Array.from(counts.entries())) {
    if (count > maxCount) {
      maxCount = count;
      favoriteLift = name;
    }
  }

  return favoriteLift;
}

function getWindowExerciseStats(
  exercises: Exercise[],
): Map<string, ExerciseWindowStats> {
  const perExercise = new Map<
    string,
    {
      sessionDates: Set<string>;
      volume: number;
      bestWeight: number;
      best1RM: number;
      bestReps: number;
      setCount: number;
    }
  >();

  for (const exercise of exercises) {
    const existing = perExercise.get(exercise.name) ?? {
      sessionDates: new Set<string>(),
      volume: 0,
      bestWeight: 0,
      best1RM: 0,
      bestReps: 0,
      setCount: 0,
    };

    existing.sessionDates.add(exercise.date);
    existing.volume += exercise.weight * exercise.reps;
    existing.bestWeight = Math.max(existing.bestWeight, exercise.weight);
    existing.best1RM = Math.max(
      existing.best1RM,
      calculate1RM(exercise.weight, exercise.reps),
    );
    existing.bestReps = Math.max(existing.bestReps, exercise.reps);
    existing.setCount += 1;

    perExercise.set(exercise.name, existing);
  }

  const result = new Map<string, ExerciseWindowStats>();
  for (const [name, stats] of Array.from(perExercise.entries())) {
    result.set(name, {
      sessions: stats.sessionDates.size,
      volume: stats.volume,
      bestWeight: stats.bestWeight,
      best1RM: stats.best1RM,
      bestReps: stats.bestReps,
      setCount: stats.setCount,
    });
  }

  return result;
}

function getPerformanceMetric(
  exerciseName: string,
  stats: ExerciseWindowStats,
  allExercises: Exercise[],
): number {
  if (isBodyweightExercise(allExercises, exerciseName)) {
    return stats.bestReps;
  }

  return stats.best1RM;
}

export function getLatestWorkoutDate(exercises: Exercise[]): string {
  if (exercises.length === 0) return "";

  let latest = exercises[0]?.date ?? "";
  for (const exercise of exercises) {
    if (exercise.date > latest) {
      latest = exercise.date;
    }
  }

  return latest;
}

export function getExercisesInDateWindow(
  exercises: Exercise[],
  startDate: string,
  endDate: string,
): Exercise[] {
  return exercises.filter(
    (exercise) => exercise.date >= startDate && exercise.date <= endDate,
  );
}

export function getWindowComparison(
  exercises: Exercise[],
  windowDays = 42,
  anchorDate?: string,
): {
  anchorDate: string;
  currentStartDate: string;
  currentEndDate: string;
  previousStartDate: string;
  previousEndDate: string;
  currentExercises: Exercise[];
  previousExercises: Exercise[];
} | null {
  if (exercises.length === 0) return null;

  const endDate = anchorDate ?? getLatestWorkoutDate(exercises);
  if (!endDate) return null;

  const end = parseYYMMDDToUTC(endDate);
  const currentStart = addDaysUTC(end, -(windowDays - 1));
  const previousEnd = addDaysUTC(currentStart, -1);
  const previousStart = addDaysUTC(previousEnd, -(windowDays - 1));

  const currentStartDate = formatUTCToYYMMDD(currentStart);
  const currentEndDate = formatUTCToYYMMDD(end);
  const previousStartDate = formatUTCToYYMMDD(previousStart);
  const previousEndDate = formatUTCToYYMMDD(previousEnd);

  return {
    anchorDate: endDate,
    currentStartDate,
    currentEndDate,
    previousStartDate,
    previousEndDate,
    currentExercises: getExercisesInDateWindow(
      exercises,
      currentStartDate,
      currentEndDate,
    ),
    previousExercises: getExercisesInDateWindow(
      exercises,
      previousStartDate,
      previousEndDate,
    ),
  };
}

export function getRotationQualityMetrics(
  exercises: Exercise[],
  windowDays = 42,
  anchorDate?: string,
): RotationQualityMetrics | null {
  const windows = getWindowComparison(exercises, windowDays, anchorDate);
  if (!windows) return null;

  const currentStats = getWindowExerciseStats(windows.currentExercises);
  const previousStats = getWindowExerciseStats(windows.previousExercises);

  const activeExercises = new Set(Array.from(currentStats.keys()));
  const previousExercises = new Set(Array.from(previousStats.keys()));

  let improvingCount = 0;
  let stableCount = 0;
  let decliningCount = 0;
  let emergingCount = 0;
  let phasedOutCount = 0;

  const progressionSamples: number[] = [];

  for (const exerciseName of Array.from(activeExercises)) {
    const current = currentStats.get(exerciseName);
    if (!current) continue;

    const previous = previousStats.get(exerciseName);
    if (!previous) {
      emergingCount += 1;
      continue;
    }

    const currentMetric = getPerformanceMetric(
      exerciseName,
      current,
      exercises,
    );
    const previousMetric = getPerformanceMetric(
      exerciseName,
      previous,
      exercises,
    );

    if (previousMetric <= 0) {
      stableCount += 1;
      continue;
    }

    const changeRatio = (currentMetric - previousMetric) / previousMetric;
    progressionSamples.push(clamp(changeRatio, -1, 1));

    if (changeRatio > 0.01) {
      improvingCount += 1;
    } else if (changeRatio < -0.01) {
      decliningCount += 1;
    } else {
      stableCount += 1;
    }
  }

  for (const exerciseName of Array.from(previousExercises)) {
    if (!activeExercises.has(exerciseName)) {
      phasedOutCount += 1;
    }
  }

  const averageProgression =
    progressionSamples.length > 0
      ? progressionSamples.reduce((acc, value) => acc + value, 0) /
        progressionSamples.length
      : 0;
  const progressionScore = Math.round(
    clamp(50 + averageProgression * 50, 0, 100),
  );

  const currentSessions = getUniqueSessionCount(windows.currentExercises);
  const previousSessions = getUniqueSessionCount(windows.previousExercises);
  const sessionsPerWeek = currentSessions / (windowDays / 7);
  const consistencyScore = Math.round(
    clamp((sessionsPerWeek / 4) * 100, 0, 100),
  );

  const activeExerciseCount = activeExercises.size;
  let balanceScore = 100;
  if (activeExerciseCount > 1) {
    const totalSets = windows.currentExercises.length;
    let entropy = 0;

    for (const stats of Array.from(currentStats.values())) {
      const p = stats.setCount / totalSets;
      if (p > 0) {
        entropy -= p * Math.log(p);
      }
    }

    const maxEntropy = Math.log(activeExerciseCount);
    balanceScore = Math.round(clamp((entropy / maxEntropy) * 100, 0, 100));
  }

  const qualityScore = Math.round(
    clamp(
      progressionScore * 0.45 + consistencyScore * 0.35 + balanceScore * 0.2,
      0,
      100,
    ),
  );

  const currentBlockVolume = windows.currentExercises.reduce(
    (acc, exercise) => acc + exercise.weight * exercise.reps,
    0,
  );
  const previousBlockVolume = windows.previousExercises.reduce(
    (acc, exercise) => acc + exercise.weight * exercise.reps,
    0,
  );

  const totalVolume = exercises.reduce(
    (acc, exercise) => acc + exercise.weight * exercise.reps,
    0,
  );

  return {
    anchorDate: windows.anchorDate,
    windowDays,
    qualityScore,
    progressionScore,
    consistencyScore,
    balanceScore,
    totalVolume,
    currentBlockVolume,
    previousBlockVolume,
    blockVolumeDelta: currentBlockVolume - previousBlockVolume,
    activeExercisesCount: activeExerciseCount,
    improvingCount,
    stableCount,
    decliningCount,
    emergingCount,
    phasedOutCount,
    currentSessions,
    previousSessions,
    sessionsPerWeek,
    favoriteLift: getFavoriteLift(windows.currentExercises),
  };
}
