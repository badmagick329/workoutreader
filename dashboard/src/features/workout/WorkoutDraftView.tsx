import { useEffect, useState } from "react";
import { ApiError, request, type Snapshot, type Workout } from "@/services/exerciseApi";
import { useSavedEditor } from "@/hooks/useSavedEditor";
import { Exercise } from "../../../../src/exercise";
import { formatWorkoutDate } from "@/shared/date";

const today = () => { const now = new Date(); return `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`; };
const inputDate = (date: string) => `20${date.slice(0, 2)}-${date.slice(2, 4)}-${date.slice(4)}`;
const setLine = (set: Exercise) => `${set.name} ${set.isBarbell ? `${set.weight - 20}b` : set.isBodyweight ? "" : `${set.weight}w`} ${set.reps}`.replace(/ +/g, " ");

export function WorkoutDraftView({ onFinished }: { onFinished: () => void }) {
  const editor = useSavedEditor<Workout | null>("workout-draft", null, true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [next, setNext] = useState<Snapshot<Workout | null> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [finishAttempt, setFinishAttempt] = useState<{ id: string; revision: string; logRevision: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem("workoutreview:finish") ?? "null"); } catch { return null; }
  });
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [kind, setKind] = useState("w");
  const draft = editor.value;
  const loadTemplates = async () => {
    const [history, savedNext] = await Promise.all([request<Snapshot<Workout[]>>("workouts"), request<Snapshot<Workout | null>>("next-workout")]);
    setWorkouts(history.value); setNext(savedNext);
  };
  useEffect(() => { void loadTemplates().catch(cause => setError(cause.message)); }, []);
  const act = async (action: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await action(); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const start = (workout?: Workout) => {
    try {
      const targets = workout?.lines.flatMap(line => { const sets = Exercise.fromLine(workout.date, line); return sets.length ? sets.map(setLine) : [line]; }) ?? [];
      editor.edit({ date: today(), lines: [], targets });
    } catch (cause) { setError((cause as Error).message); }
  };
  const finish = async (choice?: "merge" | "overwrite") => act(async () => {
    let attempt = finishAttempt;
    if (!attempt) {
      const saved = await editor.save();
      const history = await request<Snapshot<Workout[]>>("workouts");
      attempt = { id: Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join("-"), revision: saved.revision, logRevision: history.revision };
      setFinishAttempt(attempt); localStorage.setItem("workoutreview:finish", JSON.stringify(attempt));
    }
    let result: { conflict: boolean };
    try {
      result = await request<{ conflict: boolean }>("workout-draft/finish", "POST", { id: attempt.id, logRevision: attempt.logRevision, conflict: choice }, attempt.revision);
    } catch (cause) {
      if (cause instanceof ApiError && [400, 404, 412].includes(cause.status)) {
        setFinishAttempt(null); localStorage.removeItem("workoutreview:finish"); setConflict(false);
        if (cause.status === 412) await editor.load();
      }
      throw cause;
    }
    if (result.conflict) { setConflict(true); return; }
    setFinishAttempt(null); localStorage.removeItem("workoutreview:finish");
    setConflict(false); await editor.load(true); onFinished(); await loadTemplates();
  });
  const discard = () => act(async () => {
    if (!window.confirm("Discard this workout and its saved sets?")) return;
    if (editor.saving) return;
    await request("workout-draft", "DELETE", undefined, editor.revision());
    await editor.load(true);
  });
  const names = [...new Set(workouts.flatMap(workout => workout.lines.flatMap(line => {
    try { return Exercise.fromLine(workout.date, line).map(set => set.name); } catch { return []; }
  })))].sort();
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const line = `${name.trim()} ${kind === "bodyweight" ? "" : `${weight}${kind}`} ${reps}`.replace(/ +/g, " ");
    try {
      if (Exercise.fromLine(draft.date, line).length !== 1) throw new Error("Enter an exercise and completed reps");
      editor.edit({ ...draft, lines: [...draft.lines, line] }); setError(null);
    } catch (cause) { setError((cause as Error).message); }
  };
  const done = (index: number) => {
    if (!draft) return;
    const line = draft.targets![index]!;
    try {
      if (!Exercise.fromLine(draft.date, line).length) throw new Error("Add reps before marking this set done");
      editor.edit({ ...draft, lines: [...draft.lines, line], targets: draft.targets!.filter((_, i) => i !== index) }); setError(null);
    } catch (cause) { setError((cause as Error).message); }
  };
  const warning = <>{(error || editor.error) && <p className="input-editor-error" role="alert">{error || editor.error}</p>}
    {editor.conflict && <button className="archive-button" onClick={() => { if (window.confirm("Replace this device's edits with the saved version? Copy any changes you need first.")) void editor.load(true); }}>Load saved version</button>}</>;
  if (!editor.ready) return <main className="page-content">{warning}<p>Loading workout…</p><button className="archive-button" onClick={() => void editor.load()}>Retry</button></main>;
  if (!draft) return <main className="page-content workout-picker">
    <div className="page-intro"><h1>Start workout</h1><p className="intro-copy">Choose a previous session. Its sets become targets for today.</p></div>{warning}
    {finishAttempt && <button className="input-save-button" disabled={busy} onClick={() => void finish()}>Check previous finish</button>}
    {next?.value && <button className="input-save-button" disabled={!!finishAttempt} onClick={() => start(next.value!)}>Start next workout</button>}
    <button className="archive-button" disabled={!!finishAttempt} onClick={() => start()}>Start empty workout</button>
    <div className="workout-template-list">{workouts.map(workout => <div className="workout-template-row" key={workout.date}>
      <button className="workout-template" disabled={!!finishAttempt} onClick={() => start(workout)}><strong>{formatWorkoutDate(workout.date)}</strong><span>{workout.lines.join(" · ")}</span></button>
      <button className="archive-button" disabled={busy || !next} onClick={() => void act(async () => { setNext(await request("next-workout", "PUT", workout, next!.revision)); })}>Set as next</button>
    </div>)}</div>
  </main>;
  return <main className="page-content input-editor-page gym-workout">
    <div className="page-intro"><h1>Current workout</h1><p className="intro-copy">Confirm each set after you complete it. Unfinished targets stay out of your log.</p></div>{warning}
    <p role="status">{editor.saving ? "Saving…" : editor.dirty ? "Edits kept on this device · waiting to save" : "Saved"}</p>
    <fieldset disabled={busy || !!finishAttempt} className="workout-fields">
      <label className="workout-date-label">Date<input type="date" required value={inputDate(draft.date)} onChange={event => { if (event.target.value) editor.edit({ ...draft, date: event.target.value.replaceAll("-", "").slice(2) }); }} /></label>
      <section aria-label="Planned sets"><h2>Targets · {draft.targets?.length ?? 0}</h2>
        {draft.targets?.map((line, index) => <div className="target-row" key={index}>
          <label>Target {index + 1}<input aria-label={`Target ${index + 1}`} value={line} onChange={event => editor.edit({ ...draft, targets: draft.targets!.map((old, i) => i === index ? event.target.value : old) })} /></label>
          <button className="input-save-button" onClick={() => done(index)}>Done</button>
          <button className="archive-button" aria-label={`Skip target ${index + 1}`} onClick={() => editor.edit({ ...draft, targets: draft.targets!.filter((_, i) => i !== index) })}>Skip</button>
        </div>)}
      </section>
      <section><h2>Add completed set</h2><form className="set-form" onSubmit={add}>
        <label className="set-name">Exercise<input required list="exercise-names" value={name} onChange={event => setName(event.target.value)} autoComplete="off" /></label>
        <datalist id="exercise-names">{names.map(item => <option key={item} value={item} />)}</datalist>
        <label>Load type<select value={kind} onChange={event => setKind(event.target.value)}><option value="w">Weight in kg</option><option value="b">Plates + 20 kg bar</option><option value="bodyweight">Bodyweight</option></select></label>
        {kind !== "bodyweight" && <label>{kind === "b" ? "Plates, kg" : "Weight, kg"}<input type="number" inputMode="decimal" required min="0" step="0.01" value={weight} onChange={event => setWeight(event.target.value)} /></label>}
        <label>Reps<input type="number" inputMode="numeric" required min="1" step="1" value={reps} onChange={event => setReps(event.target.value)} /></label>
        <button className="input-save-button" type="submit">Record set</button>
      </form></section>
      <section><h2>Completed · {draft.lines.length}</h2>{draft.lines.map((line, index) => <div className="completed-row" key={index}><span>{line}</span><button className="archive-button" onClick={() => editor.edit({ ...draft, lines: draft.lines.filter((_, i) => i !== index), targets: [...(draft.targets ?? []), line] })}>Undo</button></div>)}</section>
    </fieldset>
    {conflict && <div className="input-editor-error">A session already exists on this date. <button className="archive-button" disabled={busy} onClick={() => void finish("merge")}>Merge sets</button> <button className="archive-button" disabled={busy} onClick={() => { if (window.confirm("Replace all completed sets on this date?")) void finish("overwrite"); }}>Replace session</button></div>}
    {finishAttempt && <p>Finish is awaiting confirmation. Retry to check it safely.</p>}
    <div className="input-editor-actions gym-actions"><button className="back-button" disabled={busy || editor.saving || !!finishAttempt} onClick={() => void discard()}>Discard workout</button><div>
      <button className="archive-button" disabled={busy || editor.saving || !!finishAttempt} onClick={() => void editor.save().catch(() => {})}>Save now</button>
      <button className="input-save-button" disabled={busy || editor.saving || (!draft.lines.length && !finishAttempt)} onClick={() => void finish()}>{busy ? "Saving…" : finishAttempt ? "Retry finish" : "Finish workout"}</button>
    </div></div>
  </main>;
}
