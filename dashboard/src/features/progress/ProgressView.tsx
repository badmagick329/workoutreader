import { useMemo, useState } from "react";
import {
  formatChange,
  formatMetric,
  formatSet,
  getProgressReport,
  type LiftSummary,
  type LiftTrend,
} from "@/features/training/training-analysis";
import { formatShortWorkoutDate } from "@/shared/date";
import type { ExerciseData } from "@/shared/workout-types";

type SortMode = "signal" | "recent" | "name";

const trendCopy: Record<LiftTrend, { label: string; description: string }> = {
  improving: { label: "Moving up", description: "last 3 vs previous 3" },
  holding: { label: "Holding", description: "last 3 vs previous 3" },
  declining: { label: "Moving down", description: "last 3 vs previous 3" },
  baseline: { label: "Building baseline", description: "under 6 sessions" },
};

export function ProgressView({
  exercises,
  onOpenLift,
}: {
  exercises: ExerciseData[];
  onOpenLift: (name: string) => void;
}) {
  const report = useMemo(() => getProgressReport(exercises), [exercises]);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("signal");

  const lifts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = report.lifts.filter((lift) =>
      lift.name.toLowerCase().includes(normalized),
    );
    return [...filtered].sort((a, b) => compareLifts(a, b, sortMode));
  }, [query, report.lifts, sortMode]);

  return (
    <main className="page-content">
      <section className="page-intro progress-intro">
        <div>
          <h1>Progress</h1>
          <p className="intro-copy">
            Same exercise only. Last 3 sessions vs previous 3.
          </p>
        </div>
      </section>

      <section className="trend-strip" aria-label="Progress summary">
        {(["improving", "holding", "declining"] as const).map((trend) => (
          <div className={`trend-summary trend-${trend}`} key={trend}>
            <span>{trendCopy[trend].label}</span>
            <strong>{report.byTrend[trend].length}</strong>
            <small>{trendCopy[trend].description}</small>
          </div>
        ))}
        <div className="trend-summary trend-baseline">
          <span>Building baseline</span>
          <strong>{report.baseline.length}</strong>
          <small>not judged yet</small>
        </div>
      </section>

      <section className="ledger-section">
        <div className="section-heading">
          <div>
            <h2>Lifts</h2>
          </div>
          <div className="ledger-controls">
            <label className="visually-hidden" htmlFor="lift-search">
              Search lifts
            </label>
            <input
              id="lift-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search lifts"
            />
            <label className="visually-hidden" htmlFor="lift-sort">
              Sort lifts
            </label>
            <select
              id="lift-sort"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="signal">Sort: signal</option>
              <option value="recent">Sort: recent</option>
              <option value="name">Sort: name</option>
            </select>
          </div>
        </div>

        <div className="lift-table-wrap">
          <table className="lift-table">
            <thead>
              <tr>
                <th>Lift</th>
                <th>Direction</th>
                <th>Evidence</th>
                <th>Latest top set</th>
                <th>Last trained</th>
              </tr>
            </thead>
            <tbody>
              {lifts.map((lift) => (
                <LiftRow key={lift.name} lift={lift} onOpen={() => onOpenLift(lift.name)} />
              ))}
            </tbody>
          </table>
          {lifts.length === 0 && (
            <p className="empty-state">No lifts match that search.</p>
          )}
        </div>
      </section>
    </main>
  );
}

function LiftRow({ lift, onOpen }: { lift: LiftSummary; onOpen: () => void }) {
  const copy = trendCopy[lift.trend];
  const evidence =
    lift.recentMedian !== null && lift.previousMedian !== null
      ? `${formatMetric(lift.recentMedian, lift.isBodyweight)} vs ${formatMetric(lift.previousMedian, lift.isBodyweight)}`
      : `${lift.sessions.length} of 6 sessions`;

  return (
    <tr className="lift-row">
      <td>
        <button type="button" className="lift-name" onClick={onOpen}>
          {lift.name}
        </button>
      </td>
      <td>
        <span className={`trend-label trend-${lift.trend}`}>{copy.label}</span>
        {lift.changeRatio !== null && (
          <span className="change-value">{formatChange(lift.changeRatio)}</span>
        )}
      </td>
      <td className="evidence-cell">{evidence}</td>
      <td>{formatSet(lift.latest.topSet, lift.isBodyweight)}</td>
      <td>{formatShortWorkoutDate(lift.latest.date)}</td>
    </tr>
  );
}

function compareLifts(a: LiftSummary, b: LiftSummary, sortMode: SortMode): number {
  if (sortMode === "name") return a.name.localeCompare(b.name);
  if (sortMode === "recent") return b.latest.date.localeCompare(a.latest.date);

  const rank: Record<LiftTrend, number> = {
    improving: 0,
    holding: 1,
    declining: 2,
    baseline: 3,
  };
  return rank[a.trend] - rank[b.trend] || b.latest.date.localeCompare(a.latest.date);
}
