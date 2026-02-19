import {
  get1RMProgression,
  getExerciseHistory,
  getMaxRepsProgression,
  getMaxWeightProgression,
  getPRs,
  getTotalRepsProgression,
} from "@/shared/workout-analysis";
import type { ExerciseData } from "@/shared/workout-types";

export type ExplorerMetric = "1rm" | "weight" | "volume" | "reps";

export function getExerciseNames(exercises: ExerciseData[]) {
  const names = new Set(exercises.map((e) => e.name));
  return Array.from(names).sort();
}

export function getExplorerChartData({
  exercises,
  selectedExercise,
  metric,
  isBodyweight,
}: {
  exercises: ExerciseData[];
  selectedExercise: string;
  metric: ExplorerMetric;
  isBodyweight: boolean;
}) {
  if (!selectedExercise) return [];

  if (metric === "1rm") {
    return get1RMProgression(exercises, selectedExercise).map((d) => ({
      date: d.date,
      value: Math.round(d.estimated1RM),
    }));
  }

  if (metric === "weight") {
    return getMaxWeightProgression(exercises, selectedExercise).map((d) => ({
      date: d.date,
      value: d.weight,
    }));
  }

  if (metric === "reps") {
    return getMaxRepsProgression(exercises, selectedExercise).map((d) => ({
      date: d.date,
      value: d.reps,
    }));
  }

  if (isBodyweight) {
    return getTotalRepsProgression(exercises, selectedExercise).map((d) => ({
      date: d.date,
      value: d.totalReps,
    }));
  }

  const history = getExerciseHistory(exercises, selectedExercise);
  const volMap = new Map<string, number>();
  history.forEach((ex) => {
    const vol = ex.weight * ex.reps;
    volMap.set(ex.date, (volMap.get(ex.date) || 0) + vol);
  });

  return Array.from(volMap.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getExplorerStats({
  exercises,
  selectedExercise,
  isBodyweight,
}: {
  exercises: ExerciseData[];
  selectedExercise: string;
  isBodyweight: boolean;
}) {
  if (!selectedExercise) return null;

  const prs = getPRs(exercises, selectedExercise);
  const history = getExerciseHistory(exercises, selectedExercise);

  let maxVol = 0;
  let heaviestSessionDate = "";
  const volMap = new Map<string, number>();

  history.forEach((ex) => {
    const vol = isBodyweight ? ex.reps : ex.weight * ex.reps;
    const newVol = (volMap.get(ex.date) || 0) + vol;
    volMap.set(ex.date, newVol);
    if (newVol > maxVol) {
      maxVol = newVol;
      heaviestSessionDate = ex.date;
    }
  });

  return {
    prWeight: prs.maxWeight.weight,
    pr1rm: Math.round(prs.max1RM.estimated1RM),
    prReps: prs.maxReps.reps,
    totalSets: history.length,
    heaviestSession: heaviestSessionDate,
    maxVolume: maxVol,
  };
}
