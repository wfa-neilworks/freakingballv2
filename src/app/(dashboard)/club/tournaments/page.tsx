import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trophy, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { TournamentStatus } from "@/types/database";

const statusDot: Record<TournamentStatus, string> = {
  draft:        "bg-white/30",
  registration: "bg-blue-400",
  active:       "bg-brand-lime animate-pulse",
  completed:    "bg-white/15",
};

export default async function TournamentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs").select("id").eq("admin_id", user!.id).single();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, status, created_at, tournament_events(id)")
    .eq("club_id", club!.id)
    .order("created_at", { ascending: false });

  const total = tournaments?.length ?? 0;
  const active = tournaments?.filter((t) => t.status === "active").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Tournaments</h1>
          <p className="mt-0.5 text-sm text-white/40">
            {total} total{active > 0 ? ` · ${active} active` : ""}
          </p>
        </div>
        <Link href="/club/tournaments/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Tournament
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {!total && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-lime/10">
            <Trophy className="h-7 w-7 text-brand-lime/60" />
          </div>
          <p className="font-semibold text-white/50">No tournaments yet</p>
          <p className="mt-1 text-sm text-white/25">Run your first tournament for your club</p>
          <Link href="/club/tournaments/new" className="mt-6">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Create Tournament
            </Button>
          </Link>
        </div>
      )}

      {/* Tournament list */}
      {total > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
          {tournaments!.map((t, i) => {
            const eventCount = Array.isArray(t.tournament_events) ? t.tournament_events.length : 0;
            return (
              <Link key={t.id} href={`/club/tournaments/${t.id}`}>
                <div className={`group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/6 ${i !== 0 ? "border-t border-white/6" : ""}`}>
                  <div className={`h-2 w-2 shrink-0 rounded-full ${statusDot[t.status as TournamentStatus]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white transition-colors group-hover:text-brand-lime">
                      {t.name}
                    </p>
                    <p className="text-xs text-white/35">
                      {eventCount} event{eventCount !== 1 ? "s" : ""}
                      {" · "}
                      {new Date(t.created_at).toLocaleDateString("en-PH", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge variant={t.status as TournamentStatus}>
                    {t.status === "registration" ? "Registration" : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                  </Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/20 transition-colors group-hover:text-white/50" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
