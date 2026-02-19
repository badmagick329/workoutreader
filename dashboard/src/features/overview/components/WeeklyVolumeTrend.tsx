import { useMemo } from "react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExerciseData } from "@/shared/workout-types";
import { getWeeklyVolumeData } from "@/features/overview/selectors/getWeeklyVolumeData";

export function WeeklyVolumeTrend({
  exercises,
}: {
  exercises: ExerciseData[];
}) {
  const data = useMemo(() => getWeeklyVolumeData(exercises), [exercises]);

  return (
    <Card className="bg-zinc-900 border-zinc-800 col-span-full">
      <CardHeader>
        <CardTitle className="text-zinc-100 text-sm">
          Weekly Volume Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  borderColor: "#27272a",
                  color: "#f4f4f5",
                }}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#8b5cf6"
                fill="url(#colorVol)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
