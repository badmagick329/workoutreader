import { useCallback, useEffect, useRef, useState } from "react";
import { fetchExerciseSettings, saveExerciseSettings } from "@/services/exerciseApi";
export function useExerciseArchive() {
  const [archivedExerciseNames, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const state = useRef({ value: { archivedExerciseNames: [] as string[] }, revision: "" });
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => { fetchExerciseSettings().then(result => { state.current = result; setNames(result.value.archivedExerciseNames); }).catch(() => setError("Exercise archive could not be loaded.")).finally(() => setLoading(false)); }, []);
  const setArchived = useCallback((name: string, archived: boolean): Promise<void> => {
    const operation = queue.current.then(async () => {
      const names = state.current.value.archivedExerciseNames;
      const next = archived ? [...new Set([...names, name])] : names.filter(item => item !== name);
      try {
        const result = await saveExerciseSettings(next, state.current.revision);
        state.current = result; setNames(result.value.archivedExerciseNames); setError(null);
      } catch (cause) { setError((cause as Error).message); }
    });
    queue.current = operation;
    return operation;
  }, []);
  return { archivedExerciseNames, loading, error, setArchived };
}
