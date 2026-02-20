import { useMemo } from "react";
import { Activity } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExerciseData } from "@/shared/workout-types";
import { getStrengthScoreSeries } from "@/features/overview/selectors/getStrengthScoreSeries";
import { CHART_STYLE } from "@/shared/chart-style";
import { ICON_STYLE } from "@/shared/icon-style";

export function StrengthScoreChart({
  exercises,
}: {
  exercises: ExerciseData[];
}) {
  const data = useMemo(() => getStrengthScoreSeries(exercises), [exercises]);

  return (
    <Card className="bg-zinc-900 border-zinc-800 col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center gap-2">
          <Activity className={`${ICON_STYLE.title} text-emerald-500`} />
          Quality Score Trend (42d vs prior 42d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={CHART_STYLE.accent}
                    stopOpacity={CHART_STYLE.accentFillOpacityTop}
                  />
                  <stop
                    offset="95%"
                    stopColor={CHART_STYLE.accent}
                    stopOpacity={CHART_STYLE.accentFillOpacityBottom}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_STYLE.grid}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke={CHART_STYLE.axis}
                tick={{ fill: CHART_STYLE.axisTick, fontSize: 12 }}
                tickFormatter={(val) => val.substring(2)}
              />
              <YAxis
                stroke={CHART_STYLE.axis}
                tick={{ fill: CHART_STYLE.axisTick, fontSize: 12 }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_STYLE.tooltipBg,
                  borderColor: CHART_STYLE.tooltipBorder,
                  color: CHART_STYLE.tooltipText,
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={CHART_STYLE.accent}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorScore)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
