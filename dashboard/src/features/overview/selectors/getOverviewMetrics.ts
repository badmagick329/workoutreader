import type { ExerciseData } from "@/shared/workout-types";
import {
  getRotationQualityMetrics,
  type RotationQualityMetrics,
  type RotationQualityConfigInput,
} from "@/shared/workout-analysis";

const overviewMetricsCache = new WeakMap<
  ExerciseData[],
  Map<string, RotationQualityMetrics>
>();

const OVERVIEW_ADAPTIVE_CONFIG: RotationQualityConfigInput = {
  consistencyTargetMode: "adaptive",
  adaptiveConsistency: {
    priorBlockCount: 3,
    fallbackTargetSessionsPerWeek: 4,
  },
};

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

export function getOverviewMetrics(
  exercises: ExerciseData[],
  config?: RotationQualityConfigInput,
) {
  const effectiveConfig = config ?? OVERVIEW_ADAPTIVE_CONFIG;

  let perExerciseCache = overviewMetricsCache.get(exercises);
  if (!perExerciseCache) {
    perExerciseCache = new Map<string, RotationQualityMetrics>();
    overviewMetricsCache.set(exercises, perExerciseCache);
  }

  const cacheKey = `${exercises.length}|${getConfigKey(effectiveConfig)}`;
  const cached = perExerciseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const metrics = getRotationQualityMetrics(
    exercises,
    42,
    undefined,
    effectiveConfig,
  );
  perExerciseCache.set(cacheKey, metrics);
  return metrics;
}
