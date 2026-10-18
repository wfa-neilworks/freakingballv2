"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function StatsBackfillButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/backfill-stats", { method: "POST" });
      const d = await res.json();
      if (!res.ok) {
        setResult(`Error: ${d.error}`);
      } else {
        setResult(`Done — ${d.matchesProcessed} matches, ${d.statsWritten} stat rows, ${d.titlesAwarded} titles. Refresh to see updates.`);
      }
    } catch {
      setResult("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={run}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Rebuilding…" : "Rebuild Stats"}
      </button>
      {result && (
        <p className="max-w-xs text-right text-xs text-white/40">{result}</p>
      )}
    </div>
  );
}
