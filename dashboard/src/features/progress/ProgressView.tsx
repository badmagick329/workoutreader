import { useMemo } from "react";
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

export type ProgressSortMode = "signal" | "recent" | "name";
export type ProgressArchiveFilter = "active" | "archived";

const trendCopy: Record<LiftTrend, { label: string; description: string }> = {
  improving: { label: "Moving up", description: "lifts, last 6 weeks" },
  holding: { label: "Holding", description: "lifts, last 6 weeks" },
  declining: { label: "Moving down", description: "lifts, last 6 weeks" },
  baseline: { label: "Too early", description: "need 6 sessions" },
};

export function ProgressView({
  exercises,
  archivedExerciseNames,
  sortMode,
  archiveFilter,
  query,
  onOpenLift,
  onChangeSort,
  onChangeArchiveFilter,
  onChangeQuery,
}: {
  exercises: ExerciseData[];
  archivedExerciseNames: string[];
  sortMode: ProgressSortMode;
  archiveFilter: ProgressArchiveFilter;
  query: string;
  onOpenLift: (name: string) => void;
  onChangeSort: (sort: ProgressSortMode) => void;
  onChangeArchiveFilter: (filter: ProgressArchiveFilter) => void;
  onChangeQuery: (query: string) => void;
}) {
  const report = useMemo(() => getProgressReport(exercises), [exercises]);
  const archivedNames = useMemo(() => new Set(archivedExerciseNames), [archivedExerciseNames]);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 42);
  const cutoffDate = `${String(cutoff.getFullYear()).slice(2)}${String(cutoff.getMonth() + 1).padStart(2, "0")}${String(cutoff.getDate()).padStart(2, "0")}`;
  const reportLifts = useMemo(
    () => report.lifts.filter((lift) => !archivedNames.has(lift.name) && lift.latest.date >= cutoffDate),
    [archivedNames, report.lifts, cutoffDate],
  );

  const lifts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = report.lifts.filter(
      (lift) =>
        lift.name.toLowerCase().includes(normalized) &&
        (archiveFilter === "archived"
          ? archivedNames.has(lift.name)
          : !archivedNames.has(lift.name)),
    );
    return [...filtered].sort((a, b) => compareLifts(a, b, sortMode));
  }, [archiveFilter, archivedNames, query, report.lifts, sortMode]);

  return (
    <main className="page-content">
      <section className="page-intro progress-intro">
        <div>
          <h1>Progress</h1>
          <p className="intro-copy">
            Each lift's last 3 sessions compared with the 3 before. Weighted and bodyweight versions are tracked separately.
          </p>
        </div>
      </section>

      <section className="trend-strip" aria-label="Progress summary">
        {(["improving", "holding", "declining", "baseline"] as const).map((trend) => (
          <div className={`trend-summary trend-${trend}`} key={trend}>
            <span>{trendCopy[trend].label}</span>
            <strong>{reportLifts.filter((lift) => lift.trend === trend).length}</strong>
            <small>{trendCopy[trend].description}</small>
          </div>
        ))}
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
              onChange={(event) => onChangeQuery(event.target.value)}
              placeholder="Search lifts"
            />
            <label className="visually-hidden" htmlFor="lift-sort">
              Sort lifts
            </label>
            <select
              id="lift-sort"
              value={sortMode}
              onChange={(event) => onChangeSort(event.target.value as ProgressSortMode)}
            >
              <option value="signal">Sort: trend</option>
              <option value="recent">Sort: recent</option>
              <option value="name">Sort: name</option>
            </select>
            <div className="archive-filter" aria-label="Lift visibility">
              <button
                type="button"
                className={archiveFilter === "active" ? "active" : ""}
                onClick={() => onChangeArchiveFilter("active")}
              >
                Active
              </button>
              <button
                type="button"
                className={archiveFilter === "archived" ? "active" : ""}
                onClick={() => onChangeArchiveFilter("archived")}
              >
                Archived
              </button>
            </div>
          </div>
        </div>

        <div className="lift-table-wrap">
          <table className="lift-table">
            <thead>
              <tr>
                <th>Lift</th>
                <th>Trend</th>
                <th>History</th>
                <th>Latest top set</th>
                <th>Last trained</th>
              </tr>
            </thead>
            <tbody>
              {lifts.map((lift) => (
                <LiftRow
                  key={lift.id}
                  lift={lift}
                  onOpen={() => onOpenLift(lift.id)}
                />
              ))}
            </tbody>
          </table>
          {lifts.length === 0 && (
            <p className="empty-state">
              {archiveFilter === "archived" ? "No archived lifts." : "No lifts match that search."}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function LiftRow({
  lift,
  onOpen,
}: {
  lift: LiftSummary;
  onOpen: () => void;
}) {
  const copy = trendCopy[lift.trend];
  const evidence =
    lift.recentMedian !== null && lift.previousMedian !== null
      ? `${formatMetric(lift.recentMedian, lift.isBodyweight)} vs ${formatMetric(lift.previousMedian, lift.isBodyweight)}`
      : `${lift.sessions.length} of 6 sessions so far`;

  return (
    <tr className="lift-row">
      <td data-label="Lift">
        <button type="button" className="lift-name" onClick={onOpen}>
          {lift.name}{lift.isBodyweight ? " · bodyweight" : ""}
        </button>
      </td>
      <td data-label="Trend">
        <span className={`trend-label trend-${lift.trend}`}>{copy.label}</span>
        {lift.changeRatio !== null && (
          <span className="change-value">{formatChange(lift.changeRatio)}</span>
        )}
      </td>
      <td className={`history-cell trend-${lift.trend}`} data-label="History" title={evidence}>
        <Sparkline values={lift.sessions.slice(-12).map((session) => session.metric)} />
      </td>
      <td data-label="Latest top set">{formatSet(lift.latest.topSet, lift.isBodyweight)}</td>
      <td data-label="Last trained">{formatShortWorkoutDate(lift.latest.date)}</td>
    </tr>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="sparkline-empty">—</span>;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values
    .map((value, index) => `${(index / (values.length - 1)) * 96 + 2},${22 - ((value - min) / span) * 18}`)
    .join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function compareLifts(a: LiftSummary, b: LiftSummary, sortMode: ProgressSortMode): number {
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
