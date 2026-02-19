import { useMemo } from "react";
import { Activity, Dumbbell, Flame, Trophy } from "lucide-react";
import { MetricCard } from "@/features/overview/components/MetricCard";
import { StrengthScoreChart } from "@/features/overview/components/StrengthScoreChart";
import { RecentPRFeed } from "@/features/overview/components/RecentPRFeed";
import { WeeklyVolumeTrend } from "@/features/overview/components/WeeklyVolumeTrend";
import { getOverviewMetrics } from "@/features/overview/selectors/getOverviewMetrics";
import type { ExerciseData } from "@/shared/workout-types";

export function OverviewTab({ exercises }: { exercises: ExerciseData[] }) {
  const metrics = useMemo(() => getOverviewMetrics(exercises), [exercises]);

  return (
    <>
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Tonnage"
            value={`${(metrics.totalVolume / 1000).toFixed(1)}k`}
            subtext="All-time volume (kg)"
            icon={Dumbbell}
            colorClass="text-blue-500"
          />
          <MetricCard
            title="Strength Score"
            value={metrics.strengthScore}
            subtext="Big 3 Total (Est. 1RM)"
            icon={Activity}
            colorClass="text-emerald-500"
          />
          <MetricCard
            title="PRs Last 30 Days"
            value={metrics.recentPRsCount}
            subtext="Recent records set"
            icon={Trophy}
            colorClass="text-yellow-500"
          />
          <MetricCard
            title="Favorite Lift"
            value={metrics.favoriteLift}
            subtext="Most frequent exercise"
            icon={Flame}
            colorClass="text-orange-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <StrengthScoreChart exercises={exercises} />
        <div className="space-y-8 lg:col-span-1">
          <RecentPRFeed exercises={exercises} />
          <WeeklyVolumeTrend exercises={exercises} />
        </div>
      </div>
    </>
  );
}
