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
          <Activity className="h-5 w-5 text-emerald-500" />
          Quality Score Trend (42d vs prior 42d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#27272a"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#52525b"
                tick={{ fill: "#71717a", fontSize: 12 }}
                tickFormatter={(val) => val.substring(2)}
              />
              <YAxis
                stroke="#52525b"
                tick={{ fill: "#71717a", fontSize: 12 }}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  borderColor: "#27272a",
                  color: "#f4f4f5",
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#10b981"
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
