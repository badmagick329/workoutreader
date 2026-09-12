import { useCallback, useEffect, useState } from "react";
import { fetchExercises } from "@/services/exerciseApi";
import type { ExerciseData } from "@/shared/workout-types";

export function useExercises() {
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    return fetchExercises()
      .then(setExercises)
      .catch((err: unknown) => {
        console.error(err);
        setError(err instanceof Error ? err.message : "Workout data could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { exercises, loading, error, reload };
}
