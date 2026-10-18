"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { TournamentStatus } from "@/types/database";

interface TournamentStatusActionsProps {
  tournamentId: string;
  currentStatus: TournamentStatus;
}

const transitions: Record<TournamentStatus, { next: TournamentStatus; label: string; hint: string } | null> = {
  draft:        { next: "registration", label: "Open Registration", hint: "Allow participants to be added to events" },
  registration: { next: "active",       label: "Start Tournament",  hint: "Lock registrations and begin match play" },
  active:       { next: "completed",    label: "Complete Tournament", hint: "Mark this tournament as finished" },
  completed:    null,
};

export function TournamentStatusActions({ tournamentId, currentStatus }: TournamentStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const transition = transitions[currentStatus];

  if (!transition) {
    return (
      <p className="text-sm text-white/30">This tournament is complete.</p>
    );
  }

  async function advance() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("tournaments").update({ status: transition!.next }).eq("id", tournamentId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <Button loading={loading} onClick={advance}>
        {transition.label}
      </Button>
      <p className="text-xs text-white/30">{transition.hint}</p>
    </div>
  );
}
