import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPRs, isBodyweightExercise } from "@/shared/workout-analysis";
import type { ExerciseData } from "@/shared/workout-types";
import { getRecentPRs } from "@/features/overview/selectors/getRecentPRs";
import { ICON_STYLE } from "@/shared/icon-style";

export function RecentPRFeed({ exercises }: { exercises: ExerciseData[] }) {
  const prs = useMemo(() => getRecentPRs(exercises), [exercises]);

  return (
    <Card className="bg-zinc-900 border-zinc-800 col-span-full lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center gap-2">
          <Trophy className={`${ICON_STYLE.title} text-yellow-500`} />
          Recent PRs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {prs.map((pr) => {
            const isBodyweight = isBodyweightExercise(exercises, pr.name);
            const prData = getPRs(exercises, pr.name);

            return (
              <div
                key={pr.name}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50"
              >
                <div className="overflow-hidden">
                  <div className="text-sm font-medium text-zinc-200 capitalize truncate">
                    {pr.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {pr.maxWeightDate}
                  </div>
                </div>
                <div className="text-lg font-bold text-emerald-500 whitespace-nowrap ml-2">
                  {isBodyweight
                    ? `${prData.maxReps.reps} reps`
                    : `${pr.maxWeight}kg`}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
