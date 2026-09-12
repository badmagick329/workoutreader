import { useEffect, useRef, useState } from "react";
import { ApiError, request, type Snapshot } from "@/services/exerciseApi";
import { SavedEdits } from "@/lib/saved-edits";

const pending = new Map<string, Promise<unknown>>();

/** Local edits are written immediately; server revisions prevent reconnects overwriting newer data. */
export function useSavedEditor<T>(path: string, empty: T, autosave = false, encode: (value: T) => unknown = value => value) {
  const edits = new SavedEdits<T>(path);
  const [value, setValue] = useState<T>(empty);
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const current = useRef<Snapshot<T> | null>(null);
  const busy = useRef<Promise<Snapshot<T>> | null>(null);

  const readLocal = () => edits.read();
  const load = async (discardLocal = false) => {
    setError(null);
    try {
      await pending.get(path)?.catch(() => {});
      const local = discardLocal ? null : readLocal();
      if (local) { current.current = local; setValue(local.value); setDirty(true); setReady(true); }
      const remote = await request<Snapshot<T>>(path);
      const recovered = discardLocal ? null : readLocal();
      if (recovered && JSON.stringify(recovered.value) !== JSON.stringify(remote.value)) {
        current.current = recovered; setValue(recovered.value); setDirty(true);
        const changed = recovered.revision !== remote.revision;
        setConflict(changed);
        if (changed) setError("Saved data changed elsewhere. Copy your edits before loading the saved version.");
      } else {
        current.current = remote; setValue(remote.value); setDirty(false); setConflict(false); edits.clear();
      }
      setReady(true);
    } catch (cause) { setError((cause as Error).message); }
  };
  useEffect(() => { void load(); }, [path]);

  const edit = (next: T) => {
    if (!current.current) return;
    current.current = { ...current.current, value: next };
    setValue(next); setDirty(true);
    if (!conflict) setError(null);
    try { edits.write(current.current); }
    catch { setError("Device storage is unavailable. Keep this page open until saved."); }
  };
  const save = async (): Promise<Snapshot<T>> => {
    if (busy.current) { await busy.current; return save(); }
    if (!current.current) throw new Error("Saved data has not loaded");
    if (conflict) throw new Error("Resolve the conflicting edit first");
    const submitted = current.current;
    setSaving(true); setError(null);
    const operation = request<Snapshot<T>>(path, "PUT", encode(submitted.value), submitted.revision);
    busy.current = operation;
    pending.set(path, operation);
    try {
      const result = await operation;
      const latest = current.current!;
      const unchanged = JSON.stringify(latest.value) === JSON.stringify(submitted.value);
      current.current = { value: latest.value, revision: result.revision };
      setDirty(!unchanged);
      edits.acknowledge(submitted, result.revision);
      return result;
    } catch (cause) {
      setError((cause as Error).message);
      if (cause instanceof ApiError && cause.status === 412) setConflict(true);
      throw cause;
    } finally { busy.current = null; pending.delete(path); setSaving(false); }
  };
  useEffect(() => {
    if (!autosave || !ready || !dirty || saving || conflict || error) return;
    const timer = window.setTimeout(() => { void save().catch(() => {}); }, 700);
    return () => window.clearTimeout(timer);
  }, [value, ready, dirty, saving, conflict, error]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return { value, edit, ready, dirty, saving, error, conflict, save, load, revision: () => current.current!.revision };
}
