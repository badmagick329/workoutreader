import {
  getRotationQualityMetrics,
  type RotationQualityConfigInput,
} from "@/shared/workout-analysis";
import type { ExerciseData } from "@/shared/workout-types";

type StrengthScorePoint = { date: string; score: number };

const strengthScoreSeriesCache = new WeakMap<
  ExerciseData[],
  Map<string, StrengthScorePoint[]>
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

export function getStrengthScoreSeries(
  exercises: ExerciseData[],
  config?: RotationQualityConfigInput,
) {
  const effectiveConfig = config ?? OVERVIEW_ADAPTIVE_CONFIG;

  let perExerciseCache = strengthScoreSeriesCache.get(exercises);
  if (!perExerciseCache) {
    perExerciseCache = new Map<string, StrengthScorePoint[]>();
    strengthScoreSeriesCache.set(exercises, perExerciseCache);
  }

  const cacheKey = `${exercises.length}|${getConfigKey(effectiveConfig)}`;
  const cached = perExerciseCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const sortedDates = Array.from(
    new Set(exercises.map((exercise) => exercise.date)),
  ).sort();
  const result: StrengthScorePoint[] = [];

  for (const date of sortedDates) {
    const metrics = getRotationQualityMetrics(
      exercises,
      42,
      date,
      effectiveConfig,
    );
    if (!metrics || metrics.currentSessions === 0) {
      continue;
    }

    result.push({ date, score: metrics.qualityScore });
  }

  perExerciseCache.set(cacheKey, result);
  return result;
}
