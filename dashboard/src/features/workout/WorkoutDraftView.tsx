import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ApiError, request, type Snapshot, type Workout } from "@/services/exerciseApi";
import { useSavedEditor } from "@/hooks/useSavedEditor";
import { formatShortWorkoutDate, formatWorkoutDate, parseYYMMDD } from "@/shared/date";
import { getProgressReport } from "@/features/training/training-analysis";
import type { ExerciseData } from "@/shared/workout-types";
import { formatSets, previewLine, type LinePreview } from "./line-preview";
import { sameExercises } from "../../../../src/workout-log";

const today = () => {
  const now = new Date();
  return `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
};
const inputDate = (date: string) => `20${date.slice(0, 2)}-${date.slice(2, 4)}-${date.slice(4)}`;
const logDate = (date: string) => date.replaceAll("-", "").slice(2);
const workoutLines = (workout: Workout) => [...workout.lines, ...(workout.targets ?? [])];
const splitLines = (text: string) => text.split("\n").map(line => line.trim()).filter(Boolean);
const daysAgo = (date: string) => {
  const days = Math.round((parseYYMMDD(today()).getTime() - parseYYMMDD(date).getTime()) / 86_400_000);
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

export function WorkoutDraftView({ exercises, onFinished, onDraftChange }: { exercises: ExerciseData[]; onFinished: () => void; onDraftChange: (active: boolean) => void }) {
  const editor = useSavedEditor<Workout | null>("workout-draft", null, true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [draftText, setDraftText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [finishAttempt, setFinishAttempt] = useState<{ id: string; revision: string; logRevision: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem("workoutreview:finish") ?? "null"); } catch { return null; }
  });
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);
  const [caretLine, setCaretLine] = useState<number | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const lifts = useMemo(() => new Map(getProgressReport(exercises).lifts.map(lift => [lift.id, lift])), [exercises]);
  const syncDraftText = useRef(true);
  const draft = editor.value;

  useEffect(() => {
    if (!editor.ready || !syncDraftText.current) return;
    setDraftText(draft ? workoutLines(draft).join("\n") : "");
    syncDraftText.current = false;
  }, [draft, editor.ready]);
  useEffect(() => { if (editor.ready) onDraftChange(!!draft); }, [draft, editor.ready]);

  // Grows with its content so the page, not a nested box, scrolls on a phone.
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight + 2}px`;
  }, [draftText, draft !== null]);

  const loadHistory = async () => setWorkouts((await request<Snapshot<Workout[]>>("workouts")).value);
  useEffect(() => { void loadHistory().catch(cause => setError((cause as Error).message)); }, []);

  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await action(); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const editedDraft = (): Workout => ({ ...draft!, lines: splitLines(draftText), targets: undefined });
  const start = (source?: Workout) => act(async () => {
    const nextDraft: Workout = { date: today(), lines: source ? workoutLines(source) : [], source: source?.date };
    editor.edit(nextDraft);
    setDraftText(nextDraft.lines.join("\n"));
    await editor.save();
    setConflict(false);
  });
  const finish = async (choice?: "merge" | "overwrite") => act(async () => {
    if (!draft && !finishAttempt) return;
    let attempt = finishAttempt;
    if (!attempt) {
      editor.edit(editedDraft());
      const saved = await editor.save();
      const history = await request<Snapshot<Workout[]>>("workouts");
      attempt = {
        id: Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join("-"),
        revision: saved.revision,
        logRevision: history.revision,
      };
      setFinishAttempt(attempt);
      localStorage.setItem("workoutreview:finish", JSON.stringify(attempt));
    }
    let result: { conflict: boolean };
    try {
      result = await request<{ conflict: boolean }>(
        "workout-draft/finish",
        "POST",
        { id: attempt.id, logRevision: attempt.logRevision, conflict: choice },
        attempt.revision,
      );
    } catch (cause) {
      if (cause instanceof ApiError && [400, 404, 409, 412].includes(cause.status)) {
        setFinishAttempt(null);
        localStorage.removeItem("workoutreview:finish");
        setConflict(false);
        if (cause.status === 412) { syncDraftText.current = true; await editor.load(); }
      }
      throw cause;
    }
    if (result.conflict) { setConflict(true); return; }
    setFinishAttempt(null);
    localStorage.removeItem("workoutreview:finish");
    setConflict(false);
    setDraftText("");
    await editor.load(true);
    onFinished();
    await loadHistory();
  });
  const cancel = () => act(async () => {
    if (!window.confirm("Cancel this workout? Nothing will be added to your log.")) return;
    await request("workout-draft", "DELETE", undefined, editor.revision());
    setDraftText("");
    setConflict(false);
    syncDraftText.current = true;
    await editor.load(true);
  });
  const warning = <>
    {(error || editor.error) && <p className="input-editor-error" role="alert">{error || editor.error}</p>}
    {editor.conflict && <button className="archive-button" onClick={() => {
      if (window.confirm("Replace this device's edits with the saved version? Copy any changes you need first.")) {
        syncDraftText.current = true;
        void editor.load(true);
      }
    }}>Load saved version</button>}
  </>;

  if (!editor.ready) return <main className="page-content">{warning}<p>Loading workout…</p><button className="archive-button" onClick={() => void editor.load()}>Retry</button></main>;

  const last = workouts[0];
  if (!draft) return <main className="page-content workout-picker">
    <div className="page-intro"><div>
      <p className="eyebrow">Workout</p>
      <h1>Log a workout</h1>
      <p className="intro-copy">{last ? <>Last logged: <strong>{formatWorkoutDate(last.date)}</strong> · {daysAgo(last.date)}</> : "Nothing logged yet."}</p>
    </div></div>
    {warning}
    {finishAttempt && <button className="input-save-button" disabled={busy} onClick={() => void finish()}>Check previous finish</button>}
    <button className="input-save-button" disabled={busy || !!finishAttempt} onClick={() => void start()}>Start empty workout</button>
    {workouts.length > 0 && <section aria-labelledby="repeat-heading">
      <h2 id="repeat-heading" className="workout-section-heading">Or repeat a past workout</h2>
      <p className="workout-section-copy">Copies its exercises into a new workout for today. Nothing is logged until you finish.</p>
      <div className="workout-template-list">
        {(showAllWorkouts ? workouts : workouts.slice(0, 5)).map((workout, index) => <div className="workout-template-row" key={`${workout.date}-${index}`}>
          <div className="workout-template"><strong>{formatWorkoutDate(workout.date)}</strong><span>{workoutLines(workout).join(" · ") || "No exercises"}</span></div>
          <button className="archive-button" disabled={busy || !!finishAttempt} onClick={() => void start(workout)}>Repeat</button>
        </div>)}
      </div>
      {!showAllWorkouts && workouts.length > 5 && <button className="text-button" type="button" onClick={() => setShowAllWorkouts(true)}>Show all {workouts.length} workouts</button>}
    </section>}
  </main>;

  const lines = splitLines(draftText);
  const duplicate = workouts.find(workout => sameExercises(workout.lines, lines));
  const locked = busy || !!finishAttempt;
  const previews = lines.map(line => previewLine(line, draft.date, lifts));
  const currentLine = caretLine === null ? null : draftText.split("\n")[caretLine]?.trim();
  const current = currentLine ? previewLine(currentLine, draft.date, lifts) : null;
  const updateCaret = (target: HTMLTextAreaElement) => setCaretLine(target.value.slice(0, target.selectionStart).split("\n").length - 1);
  return <main className="page-content workout-page">
    <div className="workout-header">
      <p className="eyebrow">Workout in progress</p>
      <div className="workout-meta">
        <input className="workout-date" type="date" aria-label="Workout date" value={inputDate(draft.date)} onChange={event => editor.edit({ ...editedDraft(), date: logDate(event.target.value) })} disabled={locked} />
        {draft.source && <span>Copied from {formatShortWorkoutDate(draft.source)}</span>}
      </div>
    </div>
    {warning}
    <textarea ref={textarea} className="workout-input" value={draftText} onChange={event => {
      setDraftText(event.target.value);
      updateCaret(event.target);
      editor.edit({ ...draft, lines: splitLines(event.target.value), targets: undefined });
    }} onSelect={event => updateCaret(event.currentTarget)} onBlur={() => setCaretLine(null)} disabled={locked} aria-label="Current workout exercises" spellCheck={false} autoCapitalize="none" autoCorrect="off" autoComplete="off" placeholder={"squat 30b 6 6\npull up 8 7"} />
    {duplicate && <p className="workout-notice" role="status">Identical to the workout logged on {formatWorkoutDate(duplicate.date)}. Change your sets before finishing.</p>}
    {conflict && <div className="input-editor-error">A workout is already logged on this date. <button type="button" onClick={() => void finish("merge")}>Add to it</button> <button type="button" onClick={() => void finish("overwrite")}>Replace it</button></div>}
    {finishAttempt && <p>Finish is awaiting confirmation. Retry to check it safely.</p>}
    {previews.length > 0 && <section className="workout-preview" aria-labelledby="preview-heading">
      <h2 id="preview-heading">Today vs last time</h2>
      {previews.map((preview, index) => <LinePreviewRow key={index} preview={preview} />)}
    </section>}
    <button type="button" className="text-button workout-cancel" onClick={() => void cancel()} disabled={locked || editor.saving}>Cancel workout · log nothing</button>
    <div className="workout-action-bar">
      {current && <div className="workout-current" aria-live="polite"><LinePreviewRow preview={current} compact /></div>}
      <div className="workout-action-row">
        <span>{editor.saving ? "Saving…" : editor.dirty ? "Unsaved" : "Saved"}</span>
        <button type="button" className="input-save-button" onClick={() => void finish()} disabled={busy || (!finishAttempt && (!!duplicate || !lines.length))}>{busy ? "Saving…" : finishAttempt ? "Retry finish" : "Finish · add to log"}</button>
      </div>
    </div>
  </main>;
}

function LinePreviewRow({ preview, compact = false }: { preview: LinePreview; compact?: boolean }) {
  if (preview.error) return <p className="line-preview line-preview-error"><code>{preview.line}</code><span>{preview.error}</span></p>;
  if (!preview.lifts.length) return null;
  return <>{preview.lifts.map(lift => <p className="line-preview" key={`${lift.name}-${lift.isBodyweight}`}>
    <strong>{lift.name}</strong>
    {!compact && <span>{lift.sets.length ? formatSets(lift.sets, lift.isBodyweight) : "no sets yet"}</span>}
    <small>{lift.last ? <>Last {formatShortWorkoutDate(lift.last.date)}: {formatSets(lift.last.sets, lift.isBodyweight)}</> : "First time"}</small>
  </p>)}</>;
}
