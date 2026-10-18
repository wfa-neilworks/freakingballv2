import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { TournamentStatus } from "@/types/database";

export default async function TournamentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("admin_id", user!.id)
    .single();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select(`
      id, name, status, created_at,
      tournament_events(id)
    `)
    .eq("club_id", club!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tournaments</h1>
          <p className="text-sm text-white/50">Manage club tournaments</p>
        </div>
        <Link href="/club/tournaments/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Tournament
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {!tournaments?.length && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center text-white/40">
            No tournaments yet.
          </div>
        )}
        {tournaments?.map((t) => {
          const eventCount = Array.isArray(t.tournament_events)
            ? t.tournament_events.length
            : 0;
          return (
            <Link key={t.id} href={`/club/tournaments/${t.id}`}>
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-brand-lime/20 hover:bg-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{t.name}</h3>
                      <Badge variant={t.status as TournamentStatus}>{t.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-white/50">
                      {eventCount} event{eventCount !== 1 ? "s" : ""}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Created{" "}
                      {new Date(t.created_at).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
