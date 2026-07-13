import { useEffect, useState } from "react";
import { fetchExercises } from "@/services/exerciseApi";
import type { ExerciseData } from "@/shared/workout-types";

export function useExercises() {
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExercises()
      .then(setExercises)
      .catch((err: unknown) => {
        console.error(err);
        setError("Workout data could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, []);

  return { exercises, loading, error };
}
