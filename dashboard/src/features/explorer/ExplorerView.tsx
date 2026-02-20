import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { isBodyweightExercise } from "@/shared/workout-analysis";
import type { ExerciseData } from "@/shared/workout-types";
import {
  getExerciseNames,
  getExplorerChartData,
  getExplorerStats,
  type ExplorerMetric,
} from "@/features/explorer/selectors/getExplorerData";

export function ExplorerView({ exercises }: { exercises: ExerciseData[] }) {
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [metric, setMetric] = useState<ExplorerMetric>("1rm");

  const exerciseNames = useMemo(() => getExerciseNames(exercises), [exercises]);

  useEffect(() => {
    if (!selectedExercise && exerciseNames.length > 0) {
      const preferred = ["squat", "bench press", "deadlift"];
      const found = preferred.find((p) => exerciseNames.includes(p));
      setSelectedExercise(found || exerciseNames[0]);
    }
  }, [exerciseNames, selectedExercise]);

  const isBodyweight = useMemo(() => {
    if (!selectedExercise) return false;
    return isBodyweightExercise(exercises, selectedExercise);
  }, [exercises, selectedExercise]);

  useEffect(() => {
    if (isBodyweight) {
      if (metric === "1rm" || metric === "weight") {
        setMetric("reps");
      }
    } else {
      if (metric === "reps") {
        setMetric("1rm");
      }
    }
  }, [isBodyweight, metric]);

  const chartData = useMemo(
    () =>
      getExplorerChartData({
        exercises,
        selectedExercise,
        metric,
        isBodyweight,
      }),
    [exercises, selectedExercise, metric, isBodyweight],
  );

  const stats = useMemo(
    () =>
      getExplorerStats({
        exercises,
        selectedExercise,
        isBodyweight,
      }),
    [exercises, selectedExercise, isBodyweight],
  );

  const statusTone =
    stats?.blockStatus === "improving"
      ? "text-emerald-500"
      : stats?.blockStatus === "declining"
        ? "text-rose-500"
        : stats?.blockStatus === "emerging"
          ? "text-sky-500"
          : stats?.blockStatus === "phased-out"
            ? "text-zinc-500"
            : "text-zinc-200";

  const deltaLabel = `${stats && stats.blockDeltaRatio > 0 ? "+" : ""}${((stats?.blockDeltaRatio ?? 0) * 100).toFixed(1)}%`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-4">
              <Select
                value={selectedExercise}
                onValueChange={setSelectedExercise}
              >
                <SelectTrigger className="w-60 bg-zinc-950 border-zinc-800 text-zinc-100">
                  <SelectValue placeholder="Select exercise" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  {exerciseNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              {isBodyweight ? (
                <>
                  <button
                    onClick={() => setMetric("reps")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      metric === "reps"
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Max Reps
                  </button>
                  <button
                    onClick={() => setMetric("volume")}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      metric === "volume"
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Total Reps
                  </button>
                </>
              ) : (
                (["1rm", "weight", "volume"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      metric === m
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {m === "1rm"
                      ? "Est. 1RM"
                      : m === "weight"
                        ? "Max Weight"
                        : "Volume"}
                  </button>
                ))
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
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
                    itemStyle={{ color: "#10b981" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                  {metric === "weight" && stats && (
                    <ReferenceLine
                      y={stats.prWeight}
                      stroke="#eab308"
                      strokeDasharray="3 3"
                      label={{
                        value: "PR",
                        fill: "#eab308",
                        fontSize: 10,
                      }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm">
              Current Block Peak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">
              {stats?.currentBlockMetric}
              <span className="text-lg text-zinc-600 ml-1">
                {isBodyweight ? "reps" : "kg"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Best set in current 42d
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm">
              Previous Block Peak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {stats?.previousBlockMetric}
              <span className="text-lg text-zinc-600 ml-1">
                {isBodyweight ? "reps" : "kg"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Best set in previous 42d
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm">
              Block Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold capitalize ${statusTone}`}>
              {stats?.blockStatus ?? "stable"}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Delta vs previous block: {deltaLabel}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm">
              Session Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {stats?.maxVolume}
              <span className="text-sm text-zinc-600 ml-1">
                {isBodyweight ? "reps" : "kg"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Top session: {stats?.heaviestSession}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm">Total Sets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-100">
              {stats?.totalSets}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Sets performed all-time
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
