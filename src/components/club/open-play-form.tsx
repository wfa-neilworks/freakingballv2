"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { PlayType, PartnerMode } from "@/types/database";

interface OpenPlayFormProps {
  clubId: string;
  adminId: string;
}

export function OpenPlayForm({ clubId, adminId }: OpenPlayFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    play_type: "doubles" as PlayType,
    doubles_category: "mens",
    partner_mode: "rotating" as PartnerMode,
    date_time: "",
    location: "",
    num_courts: "2",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isSingles = form.play_type === "singles";
  const isDoubles = !isSingles;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("open_plays")
      .insert({
        club_id: clubId,
        name: form.name.trim(),
        play_type: form.play_type,
        doubles_category:
          form.play_type === "doubles"
            ? (form.doubles_category as "mens" | "womens")
            : null,
        partner_mode: isSingles ? null : form.partner_mode,
        date_time: new Date(form.date_time).toISOString(),
        location: form.location.trim(),
        num_courts: parseInt(form.num_courts, 10),
        status: "scheduled",
        created_by: adminId,
      })
      .select("id")
      .single();

    if (err || !data) {
      setError(err?.message ?? "Failed to create session.");
      setLoading(false);
      return;
    }

    router.push(`/club/open-play/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Session Name *"
        placeholder="Friday Evening Open Play"
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

      {isDoubles && (
        <Select
          label="Partner Mode *"
          value={form.partner_mode}
          onChange={(e) => update("partner_mode", e.target.value)}
        >
          <option value="rotating">Rotating Partners</option>
          <option value="fixed">Fixed Partners</option>
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

      <Input
        label="Number of Courts *"
        type="number"
        min="1"
        max="20"
        value={form.num_courts}
        onChange={(e) => update("num_courts", e.target.value)}
        required
      />

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>
          Create Session
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
