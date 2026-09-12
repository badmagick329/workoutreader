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
  id: string;
  sameWeightRepChange: number | null;
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
  id: string;
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

export const liftId = (set: ExerciseData) => `${set.name}::${set.isBodyweight ? "bodyweight" : "loaded"}`;

export function getProgressReport(exercises: ExerciseData[]): ProgressReport {
  const sessions = getWorkoutSessions(exercises);
  const byLift = new Map<string, ExerciseData[]>();

  for (const exercise of exercises) {
    const existing = byLift.get(liftId(exercise)) ?? [];
    existing.push(exercise);
    byLift.set(liftId(exercise), existing);
  }

  const lifts = Array.from(byLift.entries())
    .map(([id, sets]) => buildLiftSummary(id, sets))
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

  for (const exercise of exercises) {
    const existing = byDate.get(exercise.date) ?? [];
    existing.push(exercise);
    byDate.set(exercise.date, existing);

  }

  return Array.from(byDate.entries())
    .map(([date, sets]) => {
      const byExercise = new Map<string, ExerciseData[]>();
      for (const set of sets) {
        const existing = byExercise.get(liftId(set)) ?? [];
        existing.push(set);
        byExercise.set(liftId(set), existing);
      }

      const sessionExercises = Array.from(byExercise.entries()).map(
        ([id, exerciseSets]) => {
          const name = exerciseSets[0]!.name;
          const isBodyweight = exerciseSets[0]!.isBodyweight;
          const performance = getSessionPerformance(exerciseSets, isBodyweight);
          return {
            id,
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

function buildLiftSummary(id: string, sets: ExerciseData[]): LiftSummary {
  const name = sets[0]!.name;
  const isBodyweight = sets[0]!.isBodyweight;
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

  const previousAtWeight = sessions.slice(0, -1).reverse().find(session => session.sets.some(set => set.weight === latest.topSet.weight));
  const sameWeightRepChange = previousAtWeight ? latest.topSet.reps - Math.max(...previousAtWeight.sets.filter(set => set.weight === latest.topSet.weight).map(set => set.reps)) : null;
  return {
    id,
    sameWeightRepChange,
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
