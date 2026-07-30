import { useMemo } from "react";
import {
  formatChange,
  formatMetric,
  formatSet,
  getProgressReport,
  type LiftSummary,
} from "@/features/training/training-analysis";
import { formatWorkoutDate } from "@/shared/date";
import type { ExerciseData } from "@/shared/workout-types";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function LiftDetail({
  exercises,
  name,
  isArchived,
  onSetArchived,
  onBack,
}: {
  exercises: ExerciseData[];
  name: string;
  isArchived: boolean;
  onSetArchived: (name: string, archived: boolean) => Promise<void>;
  onBack: () => void;
}) {
  const lift = useMemo(
    () => getProgressReport(exercises).lifts.find((item) => item.name === name),
    [exercises, name],
  );

  if (!lift) {
    return (
      <main className="page-content missing-lift">
        <p className="eyebrow">Lift unavailable</p>
        <h1>That lift is not in this log.</h1>
        <button className="back-button" type="button" onClick={onBack}>
          Back to review
        </button>
      </main>
    );
  }

  return (
    <LiftReview
      lift={lift}
      isArchived={isArchived}
      onSetArchived={onSetArchived}
      onBack={onBack}
    />
  );
}

function LiftReview({
  lift,
  isArchived,
  onSetArchived,
  onBack,
}: {
  lift: LiftSummary;
  isArchived: boolean;
  onSetArchived: (name: string, archived: boolean) => Promise<void>;
  onBack: () => void;
}) {
  const unit = lift.isBodyweight ? "reps" : "kg e1RM";
  const chartData = lift.sessions.map((session) => ({
    date: session.date,
    performance: Math.round(session.metric * 10) / 10,
    median:
      session.rollingMedian === null
        ? null
        : Math.round(session.rollingMedian * 10) / 10,
  }));
  const trendDescription =
    lift.changeRatio === null
      ? `${6 - lift.sessions.length} more session${6 - lift.sessions.length === 1 ? "" : "s"} needed for a trend.`
      : `Last 3: ${formatMetric(lift.recentMedian!, lift.isBodyweight)} · Previous 3: ${formatMetric(lift.previousMedian!, lift.isBodyweight)}.`;

  return (
    <main className="page-content lift-detail">
      <button className="back-button" type="button" onClick={onBack}>
        ← Back to review
      </button>
      <section className="lift-hero">
        <div>
          <h1>{lift.name}</h1>
          <p className="intro-copy">{lift.sessions.length} sessions · {trendDescription}</p>
        </div>
        <div className="lift-actions">
          <div className="personal-best">
            <span>All-time best</span>
            <strong>{formatMetric(lift.personalBest.metric, lift.isBodyweight)}</strong>
            <small>{formatSet(lift.personalBest.topSet, lift.isBodyweight)} · {formatWorkoutDate(lift.personalBest.date)}</small>
          </div>
          <button
            className={isArchived ? "restore-button" : "archive-button"}
            type="button"
            onClick={() => void onSetArchived(lift.name, !isArchived)}
          >
            {isArchived ? "Restore lift" : "Archive lift"}
          </button>
        </div>
      </section>

      <section className="detail-metrics" aria-label="Lift trend evidence">
        <div>
          <span>Current direction</span>
          <strong className={`trend-${lift.trend}`}>{lift.trend === "baseline" ? "Building baseline" : lift.trend}</strong>
        </div>
        <div>
          <span>Change</span>
          <strong>{formatChange(lift.changeRatio)}</strong>
        </div>
        <div>
          <span>Latest top set</span>
          <strong>{formatSet(lift.latest.topSet, lift.isBodyweight)}</strong>
        </div>
      </section>

      <section className="chart-section">
        <div className="section-heading">
          <div>
            <h2>Performance</h2>
          </div>
          <p className="chart-key"><i className="actual-key" />Actual <i className="median-key" />3-session median</p>
        </div>
        <div className="performance-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 14, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#292929" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#777"
                tick={{ fill: "#8f8f8f", fontSize: 11 }}
                tickFormatter={(value) => value.slice(2)}
                minTickGap={28}
              />
              <YAxis
                stroke="#777"
                tick={{ fill: "#8f8f8f", fontSize: 11 }}
                width={44}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{ background: "#171717", border: "1px solid #333", borderRadius: 0 }}
                labelFormatter={(value) => formatWorkoutDate(String(value))}
                formatter={(value: number, key: string) => [
                  `${value} ${unit}`,
                  key === "median" ? "3-session median" : "Actual",
                ]}
              />
              <Line
                dataKey="performance"
                stroke="#f2eee5"
                strokeWidth={2}
                dot={{ r: 3, fill: "#f2eee5", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#d7ff00" }}
              />
              <Line
                dataKey="median"
                stroke="#d7ff00"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="history-section">
        <div className="section-heading">
          <div>
            <h2>Sessions</h2>
          </div>
        </div>
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Completed sets</th>
                <th>Top set</th>
                <th>Session performance</th>
              </tr>
            </thead>
            <tbody>
              {[...lift.sessions].reverse().map((session) => (
                <tr key={session.date}>
                  <td>{formatWorkoutDate(session.date)}</td>
                  <td>{session.sets.map((set) => formatSet(set, lift.isBodyweight)).join(" · ")}</td>
                  <td>{formatSet(session.topSet, lift.isBodyweight)}</td>
                  <td>{formatMetric(session.metric, lift.isBodyweight)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
