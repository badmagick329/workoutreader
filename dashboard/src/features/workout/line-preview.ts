import { Exercise } from "../../../../src/exercise";
import { tryParseNamePart, tryParseReps, tryParseWeight } from "../../../../src/parser";
import { liftId, type LiftSummary } from "@/features/training/training-analysis";
import type { ExerciseData } from "@/shared/workout-types";

export type LinePreview = {
  line: string;
  error: string | null;
  lifts: { name: string; isBodyweight: boolean; sets: ExerciseData[]; last: { date: string; sets: ExerciseData[] } | null }[];
};

/**
 * Mid-workout, the useful question is "what did I do last time?", and typos should surface while typing rather than at Finish.
 * Lines without completed sets (e.g. "bench" as a reminder) still resolve to a lift by name so last time's numbers show before the first set.
 */
export function previewLine(line: string, date: string, lifts: Map<string, LiftSummary>): LinePreview {
  let sets: Exercise[];
  try {
    sets = Exercise.fromLine(date, line);
  } catch (cause) {
    return { line, error: (cause as Error).message, lifts: [] };
  }
  const groups = new Map<string, Exercise[]>();
  for (const set of sets) groups.set(liftId(set), [...(groups.get(liftId(set)) ?? []), set]);
  if (!groups.size) {
    const name = leadingName(line);
    const hasWeight = line.split(/\s+/).some(word => tryParseWeight(word) !== null);
    const candidates = [lifts.get(`${name}::loaded`), hasWeight ? undefined : lifts.get(`${name}::bodyweight`)].filter(Boolean) as LiftSummary[];
    const lift = candidates.sort((a, b) => b.latest.date.localeCompare(a.latest.date))[0];
    return { line, error: null, lifts: name ? [{ name, isBodyweight: lift?.isBodyweight ?? false, sets: [], last: lastBefore(lift, date) }] : [] };
  }
  return {
    line,
    error: null,
    lifts: [...groups].map(([id, group]) => ({
      name: group[0]!.name,
      isBodyweight: group[0]!.isBodyweight,
      sets: group,
      last: lastBefore(lifts.get(id), date),
    })),
  };
}

export function formatSets(sets: ExerciseData[], isBodyweight: boolean): string {
  if (isBodyweight) return `${sets.map(set => set.reps).join(", ")} reps`;
  const runs: { weight: number; reps: number[] }[] = [];
  for (const set of sets) {
    const run = runs.at(-1);
    if (run?.weight === set.weight) run.reps.push(set.reps);
    else runs.push({ weight: set.weight, reps: [set.reps] });
  }
  return runs.map(run => `${run.weight} kg × ${run.reps.join(", ")}`).join(" · ");
}

function leadingName(line: string): string {
  const words: string[] = [];
  for (const word of line.split(/\s+/)) {
    if (tryParseReps(word) !== null || tryParseWeight(word) !== null) break;
    words.push(tryParseNamePart(word)!);
  }
  return words.join(" ");
}

function lastBefore(lift: LiftSummary | undefined, date: string) {
  const session = lift?.sessions.filter(item => item.date < date).at(-1);
  return session ? { date: session.date, sets: session.sets } : null;
}
