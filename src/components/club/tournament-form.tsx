"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TournamentFormProps {
  clubId: string;
  adminId: string;
}

export function TournamentForm({ clubId, adminId }: TournamentFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("tournaments")
      .insert({ club_id: clubId, name: name.trim(), status: "draft", created_by: adminId })
      .select("id")
      .single();

    if (err || !data) {
      setError(err?.message ?? "Failed to create tournament.");
      setLoading(false);
      return;
    }

    router.push(`/club/tournaments/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Tournament Name"
        placeholder="e.g. Summer Smash 2025"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading} disabled={!name.trim()}>
          Create Tournament
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
