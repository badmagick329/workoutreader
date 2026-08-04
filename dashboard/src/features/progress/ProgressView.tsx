import { Archive, RotateCcw } from "lucide-react";
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
  improving: { label: "Moving up", description: "last 3 vs previous 3" },
  holding: { label: "Holding", description: "last 3 vs previous 3" },
  declining: { label: "Moving down", description: "last 3 vs previous 3" },
  baseline: { label: "Building baseline", description: "under 6 sessions" },
};

export function ProgressView({
  exercises,
  archivedExerciseNames,
  sortMode,
  archiveFilter,
  query,
  onOpenLift,
  onSetArchived,
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
  onSetArchived: (name: string, archived: boolean) => Promise<void>;
  onChangeSort: (sort: ProgressSortMode) => void;
  onChangeArchiveFilter: (filter: ProgressArchiveFilter) => void;
  onChangeQuery: (query: string) => void;
}) {
  const report = useMemo(() => getProgressReport(exercises), [exercises]);
  const archivedNames = useMemo(() => new Set(archivedExerciseNames), [archivedExerciseNames]);
  const reportLifts = useMemo(
    () => report.lifts.filter((lift) => !archivedNames.has(lift.name)),
    [archivedNames, report.lifts],
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
            Same exercise only. Last 3 sessions vs previous 3.
          </p>
        </div>
      </section>

      <section className="trend-strip" aria-label="Progress summary">
        {(["improving", "holding", "declining"] as const).map((trend) => (
          <div className={`trend-summary trend-${trend}`} key={trend}>
            <span>{trendCopy[trend].label}</span>
            <strong>{reportLifts.filter((lift) => lift.trend === trend).length}</strong>
            <small>{trendCopy[trend].description}</small>
          </div>
        ))}
        <div className="trend-summary trend-baseline">
          <span>Building baseline</span>
          <strong>{reportLifts.filter((lift) => lift.trend === "baseline").length}</strong>
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
              <option value="signal">Sort: signal</option>
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
                <th>Direction</th>
                <th>Evidence</th>
                <th>Latest top set</th>
                <th>Last trained</th>
                <th aria-label="Archive action" />
              </tr>
            </thead>
            <tbody>
              {lifts.map((lift) => (
                <LiftRow
                  key={lift.name}
                  lift={lift}
                  isArchived={archivedNames.has(lift.name)}
                  onOpen={() => onOpenLift(lift.name)}
                  onSetArchived={onSetArchived}
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
  isArchived,
  onOpen,
  onSetArchived,
}: {
  lift: LiftSummary;
  isArchived: boolean;
  onOpen: () => void;
  onSetArchived: (name: string, archived: boolean) => Promise<void>;
}) {
  const copy = trendCopy[lift.trend];
  const evidence =
    lift.recentMedian !== null && lift.previousMedian !== null
      ? `${formatMetric(lift.recentMedian, lift.isBodyweight)} vs ${formatMetric(lift.previousMedian, lift.isBodyweight)}`
      : `${lift.sessions.length} of 6 sessions`;

  return (
    <tr className="lift-row">
      <td data-label="Lift">
        <button type="button" className="lift-name" onClick={onOpen}>
          {lift.name}
        </button>
      </td>
      <td data-label="Direction">
        <span className={`trend-label trend-${lift.trend}`}>{copy.label}</span>
        {lift.changeRatio !== null && (
          <span className="change-value">{formatChange(lift.changeRatio)}</span>
        )}
      </td>
      <td className="evidence-cell" data-label="Evidence">{evidence}</td>
      <td data-label="Latest top set">{formatSet(lift.latest.topSet, lift.isBodyweight)}</td>
      <td data-label="Last trained">{formatShortWorkoutDate(lift.latest.date)}</td>
      <td className="lift-action-cell" data-label="Actions">
        <button
          className="lift-archive-action"
          type="button"
          aria-label={`${isArchived ? "Restore" : "Archive"} ${lift.name}`}
          title={isArchived ? "Restore lift" : "Archive lift"}
          onClick={() => void onSetArchived(lift.name, !isArchived)}
        >
          {isArchived ? <RotateCcw size={15} /> : <Archive size={15} />}
        </button>
      </td>
    </tr>
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
