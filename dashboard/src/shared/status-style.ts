import type { ExerciseBlockStatus } from "@/shared/workout-analysis";

export function getStatusTextClass(status?: ExerciseBlockStatus) {
  if (status === "improving") return "text-emerald-500";
  if (status === "declining") return "text-rose-500";
  if (status === "emerging") return "text-sky-500";
  if (status === "phased-out") return "text-zinc-500";
  return "text-zinc-200";
}

export function getStatusBadgeClass(status?: ExerciseBlockStatus) {
  if (status === "improving") return "bg-emerald-500 text-zinc-950";
  if (status === "declining") return "bg-rose-500 text-zinc-950";
  if (status === "emerging") return "bg-sky-500 text-zinc-950";
  if (status === "phased-out") return "bg-zinc-700 text-zinc-200";
  return "bg-zinc-800 text-zinc-200";
}
