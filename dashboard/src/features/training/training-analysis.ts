import type { ExerciseData } from "@/shared/workout-types";

export const TREND_THRESHOLD = 0.025;

export type LiftTrend = "improving" | "holding" | "declining" | "baseline";

export type LiftSession = {
  date: string;
  sets: ExerciseData[];
  metric: number;
  topSet: ExerciseData;
  rollingMedian: number | null;
};

export type LiftSummary = {
  name: string;
  isBodyweight: boolean;
  sessions: LiftSession[];
  latest: LiftSession;
  personalBest: LiftSession;
  trend: LiftTrend;
  recentMedian: number | null;
  previousMedian: number | null;
  changeRatio: number | null;
};

export type SessionExercise = {
  name: string;
  sets: ExerciseData[];
  isBodyweight: boolean;
  topSet: ExerciseData;
  metric: number;
};

export type WorkoutSession = {
  date: string;
  exercises: SessionExercise[];
  setCount: number;
};

export type ProgressReport = {
  lifts: LiftSummary[];
  sessions: WorkoutSession[];
  byTrend: Record<Exclude<LiftTrend, "baseline">, LiftSummary[]>;
  baseline: LiftSummary[];
};

export function calculateEstimated1RM(weight: number, reps: number): number {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export function getProgressReport(exercises: ExerciseData[]): ProgressReport {
  const sessions = getWorkoutSessions(exercises);
  const byLift = new Map<string, ExerciseData[]>();

  for (const exercise of exercises) {
    const existing = byLift.get(exercise.name) ?? [];
    existing.push(exercise);
    byLift.set(exercise.name, existing);
  }

  const lifts = Array.from(byLift.entries())
    .map(([name, sets]) => buildLiftSummary(name, sets))
    .sort((a, b) => b.latest.date.localeCompare(a.latest.date));

  const byTrend = {
    improving: lifts.filter((lift) => lift.trend === "improving"),
    holding: lifts.filter((lift) => lift.trend === "holding"),
    declining: lifts.filter((lift) => lift.trend === "declining"),
  };

  return {
    lifts,
    sessions,
    byTrend,
    baseline: lifts.filter((lift) => lift.trend === "baseline"),
  };
}

export function getWorkoutSessions(exercises: ExerciseData[]): WorkoutSession[] {
  const byDate = new Map<string, ExerciseData[]>();
  const byExerciseName = new Map<string, ExerciseData[]>();

  for (const exercise of exercises) {
    const existing = byDate.get(exercise.date) ?? [];
    existing.push(exercise);
    byDate.set(exercise.date, existing);

    const sameExercise = byExerciseName.get(exercise.name) ?? [];
    sameExercise.push(exercise);
    byExerciseName.set(exercise.name, sameExercise);
  }

  return Array.from(byDate.entries())
    .map(([date, sets]) => {
      const byExercise = new Map<string, ExerciseData[]>();
      for (const set of sets) {
        const existing = byExercise.get(set.name) ?? [];
        existing.push(set);
        byExercise.set(set.name, existing);
      }

      const sessionExercises = Array.from(byExercise.entries()).map(
        ([name, exerciseSets]) => {
          const isBodyweight = isBodyweightExercise(byExerciseName.get(name)!);
          const performance = getSessionPerformance(exerciseSets, isBodyweight);
          return {
            name,
            sets: exerciseSets,
            isBodyweight,
            topSet: performance.topSet,
            metric: performance.metric,
          };
        },
      );

      return { date, exercises: sessionExercises, setCount: sets.length };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function formatSet(set: ExerciseData, isBodyweight: boolean): string {
  return isBodyweight ? `${set.reps} reps` : `${set.weight} kg × ${set.reps}`;
}

export function formatMetric(value: number, isBodyweight: boolean): string {
  return isBodyweight ? `${Math.round(value)} reps` : `${Math.round(value)} kg e1RM`;
}

export function formatChange(changeRatio: number | null): string {
  if (changeRatio === null) return "—";
  const percent = changeRatio * 100;
  return `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`;
}

function buildLiftSummary(name: string, sets: ExerciseData[]): LiftSummary {
  const isBodyweight = isBodyweightExercise(sets);
  const byDate = new Map<string, ExerciseData[]>();

  for (const set of sets) {
    const existing = byDate.get(set.date) ?? [];
    existing.push(set);
    byDate.set(set.date, existing);
  }

  const sessions = Array.from(byDate.entries())
    .map(([date, sessionSets]) => {
      const performance = getSessionPerformance(sessionSets, isBodyweight);
      return {
        date,
        sets: sessionSets,
        metric: performance.metric,
        topSet: performance.topSet,
        rollingMedian: null,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  for (let index = 2; index < sessions.length; index += 1) {
    const current = sessions[index]!;
    current.rollingMedian = median(
      sessions.slice(index - 2, index + 1).map((session) => session.metric),
    );
  }

  const latest = sessions.at(-1)!;
  const personalBest = sessions.reduce((best, session) =>
    session.metric > best.metric ? session : best,
  );

  const recentMedian =
    sessions.length >= 6 ? median(sessions.slice(-3).map((session) => session.metric)) : null;
  const previousMedian =
    sessions.length >= 6
      ? median(sessions.slice(-6, -3).map((session) => session.metric))
      : null;
  const changeRatio =
    recentMedian !== null && previousMedian !== null && previousMedian > 0
      ? (recentMedian - previousMedian) / previousMedian
      : null;

  return {
    name,
    isBodyweight,
    sessions,
    latest,
    personalBest,
    trend: getTrend(changeRatio),
    recentMedian,
    previousMedian,
    changeRatio,
  };
}

function getSessionPerformance(
  sets: ExerciseData[],
  isBodyweight: boolean,
): Pick<LiftSession, "metric" | "topSet"> {
  return sets.reduce(
    (best, set) => {
      const metric = isBodyweight
        ? set.reps
        : calculateEstimated1RM(set.weight, set.reps);
      return metric > best.metric ? { metric, topSet: set } : best;
    },
    { metric: -Infinity, topSet: sets[0]! },
  );
}

function isBodyweightExercise(exercises: ExerciseData[]): boolean {
  return exercises.every((exercise) => exercise.weight <= 1);
}

function getTrend(changeRatio: number | null): LiftTrend {
  if (changeRatio === null) return "baseline";
  if (changeRatio >= TREND_THRESHOLD) return "improving";
  if (changeRatio <= -TREND_THRESHOLD) return "declining";
  return "holding";
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}
