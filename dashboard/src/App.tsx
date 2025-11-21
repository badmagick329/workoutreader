import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Activity, Dumbbell, Calendar, Trophy, Flame } from "lucide-react";
import {
  getExerciseHistory,
  get1RMProgression,
  getMaxWeightProgression,
  getPRs,
  getExerciseSummary,
} from "../../src/analysis";
import type { Exercise } from "../../src/exercise";
import "./index.css";

// --- Types ---
type ExerciseData = Exercise;

// --- Components ---

function ExplorerView({ exercises }: { exercises: ExerciseData[] }) {
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [metric, setMetric] = useState<"1rm" | "weight" | "volume">("1rm");

  // Get unique exercise names
  const exerciseNames = useMemo(() => {
    const names = new Set(exercises.map((e) => e.name));
    return Array.from(names).sort();
  }, [exercises]);

  // Set default exercise
  useEffect(() => {
    if (!selectedExercise && exerciseNames.length > 0) {
      // Try to find a "big 3" lift, else first one
      const preferred = ["squat", "bench press", "deadlift"];
      const found = preferred.find((p) => exerciseNames.includes(p));
      setSelectedExercise(found || exerciseNames[0]);
    }
  }, [exerciseNames, selectedExercise]);

  // Calculate Chart Data
  const chartData = useMemo(() => {
    if (!selectedExercise) return [];

    if (metric === "1rm") {
      return get1RMProgression(exercises, selectedExercise).map((d) => ({
        date: d.date,
        value: Math.round(d.estimated1RM),
      }));
    } else if (metric === "weight") {
      return getMaxWeightProgression(exercises, selectedExercise).map((d) => ({
        date: d.date,
        value: d.weight,
      }));
    } else {
      // Volume
      const history = getExerciseHistory(exercises, selectedExercise);
      // Group by date
      const volMap = new Map<string, number>();
      history.forEach((ex) => {
        const vol = ex.weight * ex.reps;
        volMap.set(ex.date, (volMap.get(ex.date) || 0) + vol);
      });
      return Array.from(volMap.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
  }, [exercises, selectedExercise, metric]);

  // Calculate Stats
  const stats = useMemo(() => {
    if (!selectedExercise) return null;
    const prs = getPRs(exercises, selectedExercise);
    const history = getExerciseHistory(exercises, selectedExercise);

    // Find heaviest session
    let maxVol = 0;
    let heaviestSessionDate = "";
    const volMap = new Map<string, number>();
    history.forEach((ex) => {
      const vol = ex.weight * ex.reps;
      const newVol = (volMap.get(ex.date) || 0) + vol;
      volMap.set(ex.date, newVol);
      if (newVol > maxVol) {
        maxVol = newVol;
        heaviestSessionDate = ex.date;
      }
    });

    return {
      prWeight: prs.maxWeight.weight,
      pr1rm: Math.round(prs.max1RM.estimated1RM),
      totalSets: history.length,
      heaviestSession: heaviestSessionDate,
      maxVolume: maxVol,
    };
  }, [exercises, selectedExercise]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Controls & Chart Area */}
      <div className="lg:col-span-3 space-y-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-4">
              <Select
                value={selectedExercise}
                onValueChange={setSelectedExercise}
              >
                <SelectTrigger className="w-[240px] bg-zinc-950 border-zinc-800 text-zinc-100">
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
              {(["1rm", "weight", "volume"] as const).map((m) => (
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
              ))}
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
                    tickFormatter={(val) => val.substring(2)} // Show YYMMDD
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
                  {/* Reference Line for PR if metric matches */}
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

      {/* Sidebar Stats */}
      <div className="space-y-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm">Current PR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">
              {stats?.prWeight}
              <span className="text-lg text-zinc-600 ml-1">kg</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Best recorded weight</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm">
              Est. 1RM Ceiling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {stats?.pr1rm}
              <span className="text-lg text-zinc-600 ml-1">kg</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Theoretical max</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-400 text-sm">
              Volume Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {stats?.maxVolume}
              <span className="text-sm text-zinc-600 ml-1">kg</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Heaviest session: {stats?.heaviestSession}
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

function RecordsView({ exercises }: { exercises: ExerciseData[] }) {
  const [sortBy, setSortBy] = useState<"date" | "name">("date");

  const records = useMemo(() => {
    const summary = getExerciseSummary(exercises);

    return summary.sort((a, b) => {
      if (sortBy === "date") {
        // Sort by maxWeightDate descending (newest first)
        // If date is missing, put it last
        if (!a.maxWeightDate) return 1;
        if (!b.maxWeightDate) return -1;
        return b.maxWeightDate.localeCompare(a.maxWeightDate);
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }, [exercises, sortBy]);

  const isNewPR = (dateStr: string) => {
    if (!dateStr) return false;
    // Parse YYMMDD
    const year = 2000 + parseInt(dateStr.substring(0, 2));
    const month = parseInt(dateStr.substring(2, 4)) - 1;
    const day = parseInt(dateStr.substring(4, 6));
    const prDate = new Date(year, month, day);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return prDate > thirtyDaysAgo;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setSortBy("date")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              sortBy === "date"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setSortBy("name")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              sortBy === "name"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Name
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {records.map((rec) => (
          <Card
            key={rec.name}
            className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors group relative overflow-hidden"
          >
            {isNewPR(rec.maxWeightDate) && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-zinc-950 text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">
                NEW!
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle
                className="text-zinc-300 text-base capitalize truncate"
                title={rec.name}
              >
                {rec.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-100">
                  {rec.maxWeight}
                </span>
                <span className="text-sm text-zinc-500">kg</span>
              </div>
              <div className="flex justify-between items-center mt-4 text-xs text-zinc-500">
                <span>{rec.maxWeightDate || "N/A"}</span>
                <span className="group-hover:text-emerald-500 transition-colors">
                  Est. 1RM: {Math.round(rec.lastEstimated1RM)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: string | number;
  subtext: string;
  icon: any;
  colorClass: string;
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-zinc-100">{value}</div>
        <p className="text-xs text-zinc-500 mt-1">{subtext}</p>
      </CardContent>
    </Card>
  );
}

function GainsGraph({ exercises }: { exercises: ExerciseData[] }) {
  const data = useMemo(() => {
    const big3 = ["squat", "bench press", "deadlift"];
    const progressions = big3.map((name) => ({
      name,
      data: get1RMProgression(exercises, name),
    }));

    const allDates = new Set<string>();
    progressions.forEach((p) => p.data.forEach((d) => allDates.add(d.date)));
    const sortedDates = Array.from(allDates).sort();

    const result = [];
    const currentMax = { squat: 0, "bench press": 0, deadlift: 0 };

    for (const date of sortedDates) {
      progressions.forEach((p) => {
        const entry = p.data.find((d) => d.date === date);
        if (entry) {
          // Update max seen so far
          const key = p.name as keyof typeof currentMax;
          if (entry.estimated1RM > currentMax[key]) {
            currentMax[key] = entry.estimated1RM;
          }
        }
      });

      const score =
        currentMax.squat + currentMax["bench press"] + currentMax.deadlift;
      if (score > 0) {
        result.push({ date, score });
      }
    }
    return result;
  }, [exercises]);

  return (
    <Card className="bg-zinc-900 border-zinc-800 col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-500" />
          Strength Score Progression
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

function PRFeed({ exercises }: { exercises: ExerciseData[] }) {
  const prs = useMemo(() => {
    const summary = getExerciseSummary(exercises);
    return summary
      .filter((s) => s.maxWeightDate)
      .sort((a, b) => b.maxWeightDate.localeCompare(a.maxWeightDate))
      .slice(0, 5);
  }, [exercises]);

  return (
    <Card className="bg-zinc-900 border-zinc-800 col-span-full lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-zinc-100 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Recent PRs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {prs.map((pr) => (
            <div
              key={pr.name}
              className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50"
            >
              <div className="overflow-hidden">
                <div className="text-sm font-medium text-zinc-200 capitalize truncate">
                  {pr.name}
                </div>
                <div className="text-xs text-zinc-500">{pr.maxWeightDate}</div>
              </div>
              <div className="text-lg font-bold text-emerald-500 whitespace-nowrap ml-2">
                {pr.maxWeight}kg
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function VolumeTrend({ exercises }: { exercises: ExerciseData[] }) {
  const data = useMemo(() => {
    const weeks = new Map<string, number>();
    exercises.forEach((ex) => {
      const year = 2000 + parseInt(ex.date.substring(0, 2));
      const month = parseInt(ex.date.substring(2, 4)) - 1;
      const day = parseInt(ex.date.substring(4, 6));
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay() || 7;
      d.setDate(d.getDate() - dayOfWeek + 1);
      const weekStr = d.toISOString().split("T")[0];
      weeks.set(weekStr, (weeks.get(weekStr) || 0) + ex.weight * ex.reps);
    });

    return Array.from(weeks.entries())
      .map(([date, volume]) => ({ date, volume }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12);
  }, [exercises]);

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

export function App() {
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<
    "overview" | "explorer" | "records"
  >("overview");

  useEffect(() => {
    fetch("/api/exercises")
      .then((res) => res.json())
      .then((data) => {
        setExercises(data);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, []);

  // --- Metrics Calculation ---
  const metrics = useMemo(() => {
    if (exercises.length === 0) return null;

    const totalVolume = exercises.reduce(
      (acc, ex) => acc + ex.weight * ex.reps,
      0
    );

    // Strength Score (Current Big 3 Total)
    const big3 = ["squat", "bench press", "deadlift"];
    let strengthScore = 0;
    big3.forEach((lift) => {
      const progression = get1RMProgression(exercises, lift);
      if (progression.length > 0) {
        const max1RM = Math.max(...progression.map((p) => p.estimated1RM));
        strengthScore += max1RM;
      }
    });

    // PRs this Month
    const summary = getExerciseSummary(exercises);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPRsCount = summary.filter((s) => {
      if (!s.maxWeightDate) return false;
      const year = 2000 + parseInt(s.maxWeightDate.substring(0, 2));
      const month = parseInt(s.maxWeightDate.substring(2, 4)) - 1;
      const day = parseInt(s.maxWeightDate.substring(4, 6));
      const d = new Date(year, month, day);
      return d > thirtyDaysAgo;
    }).length;

    // Favorite Lift
    const counts = new Map<string, number>();
    exercises.forEach((ex) => {
      counts.set(ex.name, (counts.get(ex.name) || 0) + 1);
    });
    let favoriteLift = "";
    let maxCount = 0;
    for (const [name, count] of Array.from(counts.entries())) {
      if (count > maxCount) {
        maxCount = count;
        favoriteLift = name;
      }
    }

    return {
      totalVolume,
      strengthScore: Math.round(strengthScore),
      recentPRsCount,
      favoriteLift,
    };
  }, [exercises]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">
          Loading workout data...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
              Workout Analytics
            </h1>
            <div className="flex items-center gap-6 mt-4">
              <button
                onClick={() => setActiveTab("overview")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "overview"
                    ? "text-emerald-500"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("explorer")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "explorer"
                    ? "text-emerald-500"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Explorer
              </button>
              <button
                onClick={() => setActiveTab("records")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "records"
                    ? "text-emerald-500"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Records
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Online
          </div>
        </header>

        {activeTab === "overview" ? (
          <>
            {/* Hero Metrics */}
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

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <GainsGraph exercises={exercises} />
              <div className="space-y-8 lg:col-span-1">
                <PRFeed exercises={exercises} />
                <VolumeTrend exercises={exercises} />
              </div>
            </div>
          </>
        ) : activeTab === "explorer" ? (
          <ExplorerView exercises={exercises} />
        ) : (
          <RecordsView exercises={exercises} />
        )}
      </div>
    </div>
  );
}

export default App;
