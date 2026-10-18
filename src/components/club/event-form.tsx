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
    num_pools: "2",
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
      doubles_category:
        form.play_type === "doubles"
          ? (form.doubles_category as "mens" | "womens")
          : null,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Event Name *"
        placeholder="Men's Doubles"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        required
      />

      <Select
        label="Play Type *"
        value={form.play_type}
        onChange={(e) => update("play_type", e.target.value)}
      >
        <option value="singles">Singles</option>
        <option value="doubles">Doubles</option>
        <option value="mixed_doubles">Mixed Doubles</option>
        <option value="open_doubles">Open Doubles</option>
      </Select>

      {form.play_type === "doubles" && (
        <Select
          label="Doubles Category *"
          value={form.doubles_category}
          onChange={(e) => update("doubles_category", e.target.value)}
        >
          <option value="mens">Men&apos;s Doubles</option>
          <option value="womens">Women&apos;s Doubles</option>
        </Select>
      )}

      <Input
        label="Date & Time *"
        type="datetime-local"
        value={form.date_time}
        onChange={(e) => update("date_time", e.target.value)}
        required
      />

      <Input
        label="Location *"
        placeholder="SM MOA Sports Complex"
        value={form.location}
        onChange={(e) => update("location", e.target.value)}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Number of Courts *"
          type="number"
          min="1"
          max="20"
          value={form.num_courts}
          onChange={(e) => update("num_courts", e.target.value)}
          required
        />
        <Select
          label="Number of Pools *"
          value={form.num_pools}
          onChange={(e) => update("num_pools", e.target.value)}
        >
          <option value="1">1 Pool</option>
          <option value="2">2 Pools</option>
          <option value="4">4 Pools</option>
        </Select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
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
