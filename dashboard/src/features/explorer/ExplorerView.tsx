import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { getStatusTextClass } from "@/shared/status-style";
import { CHART_STYLE } from "@/shared/chart-style";
import {
  getExplorerFilter,
  getExerciseNames,
  getExplorerChartData,
  getExplorerStats,
  type ExplorerFilter,
  type ExplorerMetric,
} from "@/features/explorer/selectors/getExplorerData";

const EXPLORER_FILTERS: ExplorerFilter[] = [
  "All",
  "Push",
  "Pull",
  "Legs",
  "Custom",
];

const RECENT_LIMIT = 8;
const STORAGE_KEYS = {
  recent: "explorer:recent",
  pinned: "explorer:pinned",
  lastSelected: "explorer:lastSelected",
};

function readStoredString(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function readStoredStringArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function ExplorerView({ exercises }: { exercises: ExerciseData[] }) {
  const [selectedExercise, setSelectedExercise] = useState<string>(() =>
    readStoredString(STORAGE_KEYS.lastSelected),
  );
  const [metric, setMetric] = useState<ExplorerMetric>("1rm");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ExplorerFilter>("All");
  const [highlightedExercise, setHighlightedExercise] = useState<string>("");
  const [recentExercises, setRecentExercises] = useState<string[]>(() =>
    readStoredStringArray(STORAGE_KEYS.recent),
  );
  const [pinnedExercises, setPinnedExercises] = useState<string[]>(() =>
    readStoredStringArray(STORAGE_KEYS.pinned),
  );

  const exerciseNames = useMemo(() => getExerciseNames(exercises), [exercises]);
  const query = searchQuery.trim().toLowerCase();

  const filteredExerciseNames = useMemo(() => {
    return exerciseNames.filter((name) => {
      const matchesFilter =
        activeFilter === "All" || getExplorerFilter(name) === activeFilter;
      const matchesSearch = !query || name.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [exerciseNames, activeFilter, query]);

  const visiblePinned = useMemo(
    () =>
      pinnedExercises.filter((name) => filteredExerciseNames.includes(name)),
    [pinnedExercises, filteredExerciseNames],
  );

  const visibleRecent = useMemo(
    () =>
      recentExercises.filter(
        (name) =>
          filteredExerciseNames.includes(name) && !visiblePinned.includes(name),
      ),
    [recentExercises, filteredExerciseNames, visiblePinned],
  );

  const hasExercises = exerciseNames.length > 0;
  const hasMatches = filteredExerciseNames.length > 0;

  useEffect(() => {
    if (!hasMatches) {
      setHighlightedExercise("");
      return;
    }

    if (
      highlightedExercise &&
      filteredExerciseNames.includes(highlightedExercise)
    ) {
      return;
    }

    if (selectedExercise && filteredExerciseNames.includes(selectedExercise)) {
      setHighlightedExercise(selectedExercise);
      return;
    }

    setHighlightedExercise(filteredExerciseNames[0]);
  }, [
    hasMatches,
    highlightedExercise,
    filteredExerciseNames,
    selectedExercise,
  ]);

  useEffect(() => {
    if (exerciseNames.length === 0) {
      setSelectedExercise("");
      return;
    }

    if (selectedExercise && exerciseNames.includes(selectedExercise)) {
      return;
    }

    const stored = readStoredString(STORAGE_KEYS.lastSelected);
    if (stored && exerciseNames.includes(stored)) {
      setSelectedExercise(stored);
      return;
    }

    setSelectedExercise(exerciseNames[0]);
  }, [exerciseNames, selectedExercise]);

  useEffect(() => {
    if (!exerciseNames.length) return;

    setPinnedExercises((prev) =>
      prev.filter((name) => exerciseNames.includes(name)),
    );
    setRecentExercises((prev) =>
      prev.filter((name) => exerciseNames.includes(name)),
    );
  }, [exerciseNames]);

  useEffect(() => {
    if (!selectedExercise) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.lastSelected, selectedExercise);
    }

    setRecentExercises((prev) =>
      [
        selectedExercise,
        ...prev.filter((name) => name !== selectedExercise),
      ].slice(0, RECENT_LIMIT),
    );
  }, [selectedExercise]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEYS.recent,
      JSON.stringify(recentExercises),
    );
  }, [recentExercises]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEYS.pinned,
      JSON.stringify(pinnedExercises),
    );
  }, [pinnedExercises]);

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

  const statusTone = getStatusTextClass(stats?.blockStatus);

  const deltaLabel = `${stats && stats.blockDeltaRatio > 0 ? "+" : ""}${((stats?.blockDeltaRatio ?? 0) * 100).toFixed(1)}%`;

  const togglePinned = (exerciseName: string) => {
    setPinnedExercises((prev) => {
      if (prev.includes(exerciseName)) {
        return prev.filter((name) => name !== exerciseName);
      }
      return [exerciseName, ...prev.filter((name) => name !== exerciseName)];
    });
  };

  const selectExercise = (exerciseName: string) => {
    setSelectedExercise(exerciseName);
  };

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (!hasMatches) return;

    const currentIndex = filteredExerciseNames.indexOf(highlightedExercise);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex =
        currentIndex < 0 || currentIndex === filteredExerciseNames.length - 1
          ? 0
          : currentIndex + 1;
      setHighlightedExercise(filteredExerciseNames[nextIndex]);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex =
        currentIndex <= 0 ? filteredExerciseNames.length - 1 : currentIndex - 1;
      setHighlightedExercise(filteredExerciseNames[nextIndex]);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectExercise(highlightedExercise || filteredExerciseNames[0]);
      return;
    }

    if (event.key === "Escape") {
      setSearchQuery("");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <div className="xl:col-span-3 space-y-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-zinc-100 text-base">
              Exercise Explorer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search exercise..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              aria-label="Search exercises"
              className="bg-zinc-950 border-zinc-800 text-zinc-100"
            />
            <p className="text-xs text-zinc-500">
              Keyboard: ↑/↓ to navigate, Enter to select
            </p>

            <div className="flex flex-wrap items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800 w-fit">
              {EXPLORER_FILTERS.map((filterName) => (
                <button
                  type="button"
                  key={filterName}
                  onClick={() => setActiveFilter(filterName)}
                  aria-pressed={activeFilter === filterName}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeFilter === filterName
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {filterName}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Pinned
                </p>
                <div
                  className="space-y-2"
                  role="listbox"
                  aria-label="Pinned exercises"
                >
                  {visiblePinned.length > 0 ? (
                    visiblePinned.map((name) => {
                      const isSelected = selectedExercise === name;
                      const isHighlighted = highlightedExercise === name;
                      return (
                        <div
                          key={`pin-${name}`}
                          className="flex items-center gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => selectExercise(name)}
                            onFocus={() => setHighlightedExercise(name)}
                            aria-selected={isSelected}
                            className={`flex-1 text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                              isSelected
                                ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                                : isHighlighted
                                  ? "bg-zinc-900 border-zinc-700 text-zinc-100"
                                  : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                            }`}
                          >
                            {name}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePinned(name)}
                            aria-label={`Unpin ${name}`}
                            className="text-[11px] px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:text-zinc-100"
                          >
                            Unpin
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-zinc-600">No pinned exercises</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Recent
                </p>
                <div
                  className="space-y-2"
                  role="listbox"
                  aria-label="Recent exercises"
                >
                  {visibleRecent.length > 0 ? (
                    visibleRecent.map((name) => {
                      const isSelected = selectedExercise === name;
                      const isPinned = pinnedExercises.includes(name);
                      const isHighlighted = highlightedExercise === name;

                      return (
                        <div
                          key={`recent-${name}`}
                          className="flex items-center gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => selectExercise(name)}
                            onFocus={() => setHighlightedExercise(name)}
                            aria-selected={isSelected}
                            className={`flex-1 text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                              isSelected
                                ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                                : isHighlighted
                                  ? "bg-zinc-900 border-zinc-700 text-zinc-100"
                                  : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                            }`}
                          >
                            {name}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePinned(name)}
                            aria-label={`${isPinned ? "Unpin" : "Pin"} ${name}`}
                            className="text-[11px] px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:text-zinc-100"
                          >
                            {isPinned ? "Unpin" : "Pin"}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-zinc-600">No recent matches</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  All Matches
                </p>
                <div
                  className="max-h-48 overflow-y-auto space-y-2 pr-1"
                  role="listbox"
                  aria-label="All matching exercises"
                >
                  {filteredExerciseNames.length > 0 ? (
                    filteredExerciseNames.map((name) => {
                      const isSelected = selectedExercise === name;
                      const isPinned = pinnedExercises.includes(name);
                      const isHighlighted = highlightedExercise === name;

                      return (
                        <div
                          key={`all-${name}`}
                          className="flex items-center gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => selectExercise(name)}
                            onFocus={() => setHighlightedExercise(name)}
                            aria-selected={isSelected}
                            className={`flex-1 text-left text-sm px-3 py-2 rounded-md border transition-colors ${
                              isSelected
                                ? "bg-zinc-800 border-zinc-700 text-zinc-100"
                                : isHighlighted
                                  ? "bg-zinc-900 border-zinc-700 text-zinc-100"
                                  : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                            }`}
                          >
                            {name}
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePinned(name)}
                            aria-label={`${isPinned ? "Unpin" : "Pin"} ${name}`}
                            className="text-[11px] px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:text-zinc-100"
                          >
                            {isPinned ? "Unpin" : "Pin"}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-zinc-600">
                      No exercises found for current search/filter
                    </p>
                  )}
                </div>
              </div>
            </div>

            {!hasExercises && (
              <p className="text-sm text-zinc-500">
                No exercise data available yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-4 min-w-0">
              <CardTitle className="text-zinc-100 text-base capitalize truncate">
                {selectedExercise || "Select an exercise"}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              {isBodyweight ? (
                <>
                  <button
                    type="button"
                    onClick={() => setMetric("reps")}
                    aria-pressed={metric === "reps"}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      metric === "reps"
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Max Reps
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetric("volume")}
                    aria-pressed={metric === "volume"}
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
                    type="button"
                    onClick={() => setMetric(m)}
                    aria-pressed={metric === m}
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
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorValue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
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
                      itemStyle={{ color: CHART_STYLE.accent }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={CHART_STYLE.accent}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                    {metric === "weight" && stats && (
                      <ReferenceLine
                        y={stats.prWeight}
                        stroke={CHART_STYLE.reference}
                        strokeDasharray="3 3"
                        label={{
                          value: "PR",
                          fill: CHART_STYLE.reference,
                          fontSize: 10,
                        }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm text-zinc-500 border border-zinc-800 rounded-md bg-zinc-950/40">
                  {selectedExercise
                    ? "No chart points for this exercise yet"
                    : "Select an exercise to view progression"}
                </div>
              )}
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
