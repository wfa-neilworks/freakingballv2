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

const transitions: Record<TournamentStatus, { next: TournamentStatus; label: string } | null> = {
  draft: { next: "registration", label: "Open Registration" },
  registration: { next: "active", label: "Start Tournament" },
  active: { next: "completed", label: "Complete Tournament" },
  completed: null,
};

export function TournamentStatusActions({
  tournamentId,
  currentStatus,
}: TournamentStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const transition = transitions[currentStatus];

  if (!transition) return null;

  async function advance() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("tournaments")
      .update({ status: transition!.next })
      .eq("id", tournamentId);
    setLoading(false);
    router.refresh();
  }

  return (
    <Button size="sm" variant="outline" loading={loading} onClick={advance}>
      {transition.label}
    </Button>
  );
}
