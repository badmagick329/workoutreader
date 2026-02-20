import {
  getExerciseBlockComparisons,
  getExerciseSummary,
  getPRs,
  type ExerciseBlockStatus,
  type RotationQualityConfigInput,
} from "@/shared/workout-analysis";
import type { ExerciseData } from "@/shared/workout-types";

export type RecordRow = {
  name: string;
  isBodyweight: boolean;
  status: ExerciseBlockStatus;
  primaryValue: number;
  unit: "kg" | "reps";
  displayDate: string;
  sortDate: string;
  lastEstimated1RM: number;
};

const sortedRecordsCache = new WeakMap<
  ExerciseData[],
  Map<string, RecordRow[]>
>();

function getConfigKey(config?: RotationQualityConfigInput): string {
  if (!config) return "default";

  return JSON.stringify({
    cw: {
      p: config.compositeWeights?.progression ?? null,
      c: config.compositeWeights?.consistency ?? null,
      b: config.compositeWeights?.balance ?? null,
    },
    pt: {
      i: config.progressThresholds?.improving ?? null,
      d: config.progressThresholds?.declining ?? null,
    },
    ctm: config.consistencyTargetMode ?? null,
    ctw: config.consistencyTargetSessionsPerWeek ?? null,
    ac: {
      pbc: config.adaptiveConsistency?.priorBlockCount ?? null,
      ftsw: config.adaptiveConsistency?.fallbackTargetSessionsPerWeek ?? null,
    },
  });
}

export function getSortedRecords(
  exercises: ExerciseData[],
  sortBy: "date" | "name",
  config?: RotationQualityConfigInput,
) {
  let perExerciseCache = sortedRecordsCache.get(exercises);
  if (!perExerciseCache) {
    perExerciseCache = new Map<string, RecordRow[]>();
    sortedRecordsCache.set(exercises, perExerciseCache);
  }

  const cacheKey = `${exercises.length}|${sortBy}|${getConfigKey(config)}`;
  const cached = perExerciseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const summary = getExerciseSummary(exercises);
  const blockComparisonMap = new Map(
    getExerciseBlockComparisons(exercises, 42, undefined, config).map(
      (comparison) => [comparison.name, comparison],
    ),
  );

  const rows: RecordRow[] = summary.map((rec) => {
    const prs = getPRs(exercises, rec.name);
    const comparison = blockComparisonMap.get(rec.name);
    const isBodyweight = comparison?.isBodyweight ?? false;
    const primaryValue = isBodyweight ? prs.maxReps.reps : rec.maxWeight;
    const displayDate = isBodyweight ? prs.maxReps.date : rec.maxWeightDate;

    return {
      name: rec.name,
      isBodyweight,
      status: comparison?.status ?? "stable",
      primaryValue,
      unit: isBodyweight ? "reps" : "kg",
      displayDate,
      sortDate: displayDate,
      lastEstimated1RM: rec.lastEstimated1RM,
    };
  });

  const sorted = rows.sort((a, b) => {
    if (sortBy === "date") {
      if (!a.sortDate) return 1;
      if (!b.sortDate) return -1;
      return b.sortDate.localeCompare(a.sortDate);
    }
    return a.name.localeCompare(b.name);
  });

  perExerciseCache.set(cacheKey, sorted);
  return sorted;
}
