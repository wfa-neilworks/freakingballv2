import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { SessionStatus, TournamentStatus } from "@/types/database";
import { TournamentStatusActions } from "@/components/club/tournament-status-actions";

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("admin_id", user!.id)
    .single();

  if (!club) redirect("/club");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .eq("club_id", club.id)
    .single();

  if (!tournament) notFound();

  const { data: events } = await supabase
    .from("tournament_events")
    .select("*")
    .eq("tournament_id", id)
    .order("date_time");

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
          <Badge variant={tournament.status as TournamentStatus}>
            {tournament.status}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-white/50">
          {events?.length ?? 0} event{(events?.length ?? 0) !== 1 ? "s" : ""}
        </p>
      </div>

      <TournamentStatusActions
        tournamentId={tournament.id}
        currentStatus={tournament.status as TournamentStatus}
      />

      {/* Events */}
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">Events</h2>
          {tournament.status !== "completed" && (
            <Link href={`/club/tournaments/${id}/events/new`}>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            </Link>
          )}
        </div>

        <div className="space-y-3">
          {!events?.length && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/40">
              No events yet. Add an event to get started.
            </div>
          )}
          {events?.map((ev) => (
            <Link key={ev.id} href={`/club/tournaments/${id}/events/${ev.id}`}>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-brand-lime/20 hover:bg-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{ev.name}</h3>
                      <Badge variant={ev.status as SessionStatus}>{ev.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-white/50 capitalize">
                      {ev.play_type.replace(/_/g, " ")}
                      {ev.doubles_category ? ` · ${ev.doubles_category}` : ""}
                      {" · "}
                      {ev.num_courts} court{ev.num_courts > 1 ? "s" : ""}
                      {" · "}
                      {ev.num_pools} pool{ev.num_pools > 1 ? "s" : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-white/40">
                      {new Date(ev.date_time).toLocaleString("en-PH", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {ev.location}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
