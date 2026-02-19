import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPRs, isBodyweightExercise } from "@/shared/workout-analysis";
import { isWithinLastDays } from "@/shared/date";
import type { ExerciseData } from "@/shared/workout-types";
import { getSortedRecords } from "@/features/records/selectors/getSortedRecords";

export function RecordsView({ exercises }: { exercises: ExerciseData[] }) {
  const [sortBy, setSortBy] = useState<"date" | "name">("date");

  const records = useMemo(
    () => getSortedRecords(exercises, sortBy),
    [exercises, sortBy],
  );

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
        {records.map((rec) => {
          const isBodyweight = isBodyweightExercise(exercises, rec.name);
          const prs = getPRs(exercises, rec.name);

          return (
            <Card
              key={rec.name}
              className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors group relative overflow-hidden"
            >
              {isWithinLastDays(rec.maxWeightDate, 30) && (
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
                  {isBodyweight ? (
                    <>
                      <span className="text-3xl font-bold text-zinc-100">
                        {prs.maxReps.reps}
                      </span>
                      <span className="text-sm text-zinc-500">reps</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-zinc-100">
                        {rec.maxWeight}
                      </span>
                      <span className="text-sm text-zinc-500">kg</span>
                    </>
                  )}
                </div>
                <div className="flex justify-between items-center mt-4 text-xs text-zinc-500">
                  <span>{rec.maxWeightDate || "N/A"}</span>
                  {!isBodyweight && (
                    <span className="group-hover:text-emerald-500 transition-colors">
                      Est. 1RM: {Math.round(rec.lastEstimated1RM)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
