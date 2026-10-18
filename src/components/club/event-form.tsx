"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { PlayType } from "@/types/database";

interface EventFormProps {
  tournamentId: string;
}

export function EventForm({ tournamentId }: EventFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    play_type: "doubles" as PlayType,
    doubles_category: "mens",
    date_time: "",
    location: "",
    num_courts: "2",
    num_pools: "1",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: err } = await supabase.from("tournament_events").insert({
      tournament_id: tournamentId,
      name: form.name.trim(),
      play_type: form.play_type,
      doubles_category: form.play_type === "doubles" ? (form.doubles_category as "mens" | "womens") : null,
      date_time: new Date(form.date_time).toISOString(),
      location: form.location.trim(),
      num_courts: parseInt(form.num_courts, 10),
      num_pools: parseInt(form.num_pools, 10),
      status: "scheduled",
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    router.back();
    router.refresh();
  }

  const isDoubles = form.play_type !== "singles";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Event Name"
        placeholder="e.g. Men's Doubles"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        required
      />

      {/* Play type */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-lime">Play Type</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "singles",       label: "Singles" },
            { value: "doubles",       label: "Doubles" },
            { value: "mixed_doubles", label: "Mixed Doubles" },
            { value: "open_doubles",  label: "Open Doubles" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("play_type", opt.value)}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                form.play_type === opt.value
                  ? "border-brand-lime bg-brand-lime/10 text-brand-lime"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {form.play_type === "doubles" && (
        <Select
          label="Doubles Category"
          value={form.doubles_category}
          onChange={(e) => update("doubles_category", e.target.value)}
        >
          <option value="mens">Men&apos;s Doubles</option>
          <option value="womens">Women&apos;s Doubles</option>
        </Select>
      )}

      {/* Schedule */}
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-lime">Schedule</p>
      <Input
        label="Date & Time"
        type="datetime-local"
        value={form.date_time}
        onChange={(e) => update("date_time", e.target.value)}
        required
      />
      <Input
        label="Location"
        placeholder="e.g. SM MOA Sports Complex"
        value={form.location}
        onChange={(e) => update("location", e.target.value)}
        required
      />

      {/* Courts & Pools */}
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-lime">Format</p>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Number of Courts"
          type="number"
          min="1"
          max="20"
          value={form.num_courts}
          onChange={(e) => update("num_courts", e.target.value)}
          required
        />
        <Select
          label="Number of Pools"
          value={form.num_pools}
          onChange={(e) => update("num_pools", e.target.value)}
        >
          <option value="1">1 Pool</option>
          <option value="2">2 Pools</option>
          <option value="4">4 Pools</option>
        </Select>
      </div>

      {/* Pool seeding hint */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-xs text-white/40 space-y-1">
        {form.num_pools === "1" && <p><span className="text-white/60">1 Pool</span> — Top 4 qualify. SF: 1st vs 4th · 2nd vs 3rd</p>}
        {form.num_pools === "2" && <p><span className="text-white/60">2 Pools</span> — Top 2 per pool qualify. SF: P1-1st vs P2-2nd · P2-1st vs P1-2nd</p>}
        {form.num_pools === "4" && <p><span className="text-white/60">4 Pools</span> — Pool winners qualify. SF: P1 vs P2 · P3 vs P4</p>}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading}>
          Add Event
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
