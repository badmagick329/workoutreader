import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOverviewMetrics } from "@/features/overview/selectors/getOverviewMetrics";
import type { ExerciseData } from "@/shared/workout-types";

function getAdherenceTrendLabel(
  currentSessions: number,
  previousSessions: number,
) {
  const delta = currentSessions - previousSessions;

  if (delta > 0) {
    return `Adherence improving (+${delta} sessions vs prior 42d)`;
  }

  if (delta < 0) {
    return `Adherence easing (${delta} sessions vs prior 42d)`;
  }

  return "Adherence stable vs prior 42d";
}

export function ConsistencyReadinessCard({
  exercises,
}: {
  exercises: ExerciseData[];
}) {
  const metrics = useMemo(() => getOverviewMetrics(exercises), [exercises]);

  if (!metrics) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 col-span-full">
        <CardHeader>
          <CardTitle className="text-zinc-100 text-sm">
            Consistency + Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">No training data yet.</p>
        </CardContent>
      </Card>
    );
  }

  const trendLabel = getAdherenceTrendLabel(
    metrics.currentSessions,
    metrics.previousSessions,
  );

  return (
    <Card className="bg-zinc-900 border-zinc-800 col-span-full">
      <CardHeader>
        <CardTitle className="text-zinc-100 text-sm">
          Consistency + Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-emerald-500">
            {metrics.consistencyScore}
          </span>
          <span className="text-sm text-zinc-500">/100 consistency score</span>
        </div>

        <div className="text-xs text-zinc-400 space-y-1">
          <div>
            Target {metrics.resolvedConsistencyTargetSessionsPerWeek.toFixed(1)}
            /wk ({metrics.consistencyTargetModeUsed})
          </div>
          <div>
            Current pace {metrics.sessionsPerWeek.toFixed(1)}/wk •{" "}
            {metrics.currentSessions} sessions in current 42d
          </div>
          <div>{trendLabel}</div>
        </div>
      </CardContent>
    </Card>
  );
}
