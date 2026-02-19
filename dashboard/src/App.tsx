import { useState } from "react";
import { useExercises } from "@/hooks/useExercises";
import { OverviewTab } from "@/features/overview/OverviewTab";
import { ExplorerView } from "@/features/explorer/ExplorerView";
import { RecordsView } from "@/features/records/RecordsView";
import "./index.css";

export function App() {
  const { exercises, loading } = useExercises();

  const [activeTab, setActiveTab] = useState<
    "overview" | "explorer" | "records"
  >("overview");

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">
          Loading workout data...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
              Workout Analytics
            </h1>
            <div className="flex items-center gap-6 mt-4">
              <button
                onClick={() => setActiveTab("overview")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "overview"
                    ? "text-emerald-500"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("explorer")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "explorer"
                    ? "text-emerald-500"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Explorer
              </button>
              <button
                onClick={() => setActiveTab("records")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "records"
                    ? "text-emerald-500"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Records
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Online
          </div>
        </header>

        {activeTab === "overview" ? (
          <OverviewTab exercises={exercises} />
        ) : activeTab === "explorer" ? (
          <ExplorerView exercises={exercises} />
        ) : (
          <RecordsView exercises={exercises} />
        )}
      </div>
    </div>
  );
}

export default App;
