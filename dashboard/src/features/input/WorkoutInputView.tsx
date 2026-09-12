import { useState } from "react";
import { useSavedEditor } from "@/hooks/useSavedEditor";
import { parseExercises } from "../../../../src/workout-log";
export function WorkoutInputView({ onSaved }: { onSaved: () => void }) {
  const editor = useSavedEditor("workout-input", "", false, text => ({ text }));
  const [message, setMessage] = useState<string | null>(null);
  const save = async () => {
    try { const sets = parseExercises(editor.value); if (!window.confirm(`Replace the saved log with ${sets.length} completed sets?`)) return; await editor.save(); onSaved(); setMessage("Log saved. Previous version retained on the server."); }
    catch (cause) { setMessage((cause as Error).message); }
  };
  return <main className="page-content input-editor-page"><div className="page-intro"><h1>Edit training log</h1><p className="intro-copy">Edits are kept on this device. Save replaces the log. Dates use YYMMDD; sets use exercise, weight and reps.</p></div>
    {(editor.error || message) && <p role="status" className="input-editor-error">{editor.error || message}</p>}
    <textarea className="workout-input" value={editor.value} onChange={event => editor.edit(event.target.value)} disabled={!editor.ready || editor.saving} aria-label="Workout log" spellCheck={false} placeholder={'260912\nsquat 30b 6 6\npull up 8 7'} />
    <div className="input-editor-actions"><span>{editor.dirty ? "Unsaved edits kept on this device" : "All changes saved"}</span><button className="input-save-button" disabled={!editor.ready || editor.saving || !editor.dirty || editor.conflict} onClick={() => void save()}>Save log</button>
    <button className="archive-button" onClick={() => { if (!editor.dirty || window.confirm("Discard your local edits and load the saved log?")) void editor.load(true); }}>Load saved log</button></div>
  </main>;
}
