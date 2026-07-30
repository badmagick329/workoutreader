import { useMemo } from "react";
import {
  formatMetric,
  formatSet,
  getWorkoutSessions,
} from "@/features/training/training-analysis";
import { formatWorkoutDate } from "@/shared/date";
import type { ExerciseData } from "@/shared/workout-types";

export function SessionsView({
  exercises,
  archivedExerciseNames,
  onOpenLift,
}: {
  exercises: ExerciseData[];
  archivedExerciseNames: string[];
  onOpenLift: (name: string) => void;
}) {
  const sessions = useMemo(() => getWorkoutSessions(exercises), [exercises]);
  const archivedNames = useMemo(
    () => new Set(archivedExerciseNames),
    [archivedExerciseNames],
  );

  return (
    <main className="page-content">
      <section className="page-intro">
        <div>
          <h1>Sessions</h1>
          <p className="intro-copy">Completed sets.</p>
        </div>
        <p className="archive-count">{sessions.length} logged sessions</p>
      </section>

      <section className="session-list" aria-label="Workout sessions">
        {sessions.map((session) => (
          <article className="session-entry" key={session.date}>
            <header className="session-header">
              <time dateTime={session.date}>{formatWorkoutDate(session.date)}</time>
              <span>{session.setCount} completed sets</span>
            </header>
            <div className="session-exercises">
              {session.exercises.map((exercise) => (
                <div className="session-exercise" key={exercise.name}>
                  <div className="session-exercise-title">
                    <button type="button" onClick={() => onOpenLift(exercise.name)}>
                      {exercise.name}
                    </button>
                    {archivedNames.has(exercise.name) && (
                      <span className="archived-badge">Archived</span>
                    )}
                  </div>
                  <p>{exercise.sets.map((set) => formatSet(set, exercise.isBodyweight)).join(" · ")}</p>
                  <span>{formatMetric(exercise.metric, exercise.isBodyweight)}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
