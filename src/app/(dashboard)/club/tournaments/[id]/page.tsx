export const revalidate = 30;
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, ChevronRight, Calendar, MapPin } from "lucide-react";
import type { SessionStatus, TournamentStatus } from "@/types/database";
import { TournamentStatusActions } from "@/components/club/tournament-status-actions";

const playTypeLabel: Record<string, string> = {
  singles: "Singles",
  doubles: "Doubles",
  mixed_doubles: "Mixed Doubles",
  open_doubles: "Open Doubles",
};

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs").select("id").eq("admin_id", user!.id).single();

  if (!club) redirect("/club");

  const { data: tournament } = await supabase
    .from("tournaments").select("*").eq("id", id).eq("club_id", club.id).single();

  if (!tournament) notFound();

  const { data: events } = await supabase
    .from("tournament_events").select("*").eq("tournament_id", id).order("date_time");

  const eventCount = events?.length ?? 0;

  const statusFlow: TournamentStatus[] = ["draft", "registration", "active", "completed"];
  const currentIdx = statusFlow.indexOf(tournament.status as TournamentStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white">{tournament.name}</h1>
            <Badge variant={tournament.status as TournamentStatus}>
              {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-white/40">
            {eventCount} event{eventCount !== 1 ? "s" : ""}
          </p>
        </div>
        {tournament.status !== "completed" && (
          <Link href={`/club/tournaments/${id}/events/new`}>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add Event
            </Button>
          </Link>
        )}
      </div>

      {/* Status pipeline */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">
          Tournament Status
        </p>
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex min-w-[280px] items-center gap-0">
            {statusFlow.map((s, i) => {
              const done = i < currentIdx;
              const current = i === currentIdx;
              const label = s === "registration" ? "Reg." : s.charAt(0).toUpperCase() + s.slice(1);
              return (
                <div key={s} className="flex flex-1 items-center">
                  <div className="flex flex-1 flex-col items-center gap-1.5">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      done ? "bg-brand-lime/30 text-brand-lime" :
                      current ? "bg-brand-lime text-brand-dark" :
                      "bg-white/8 text-white/25"
                    }`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span className={`text-center text-xs leading-tight ${current ? "text-white" : done ? "text-white/50" : "text-white/20"}`}>
                      {label}
                    </span>
                  </div>
                  {i < statusFlow.length - 1 && (
                    <div className={`mb-5 h-px flex-1 ${i < currentIdx ? "bg-brand-lime/30" : "bg-white/8"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-5 border-t border-white/8 pt-4">
          <TournamentStatusActions
            tournamentId={tournament.id}
            currentStatus={tournament.status as TournamentStatus}
          />
        </div>
      </div>

      {/* Events */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-white">Events</h2>
        </div>

        {!eventCount && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-14 text-center">
            <p className="text-sm text-white/30">No events yet</p>
            {tournament.status !== "completed" && (
              <Link href={`/club/tournaments/${id}/events/new`} className="mt-4">
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                  Add First Event
                </Button>
              </Link>
            )}
          </div>
        )}

        {eventCount > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
            {events!.map((ev, i) => (
              <Link key={ev.id} href={`/club/tournaments/${id}/events/${ev.id}`}>
                <div className={`group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/6 ${i !== 0 ? "border-t border-white/6" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white transition-colors group-hover:text-brand-lime">
                        {ev.name}
                      </p>
                      <Badge variant={ev.status as SessionStatus}>{ev.status}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/35">
                      <span className="capitalize">
                        {playTypeLabel[ev.play_type] ?? ev.play_type}
                        {ev.doubles_category ? ` · ${ev.doubles_category}` : ""}
                      </span>
                      <span>{ev.num_courts} court{ev.num_courts > 1 ? "s" : ""} · {ev.num_pools} pool{ev.num_pools > 1 ? "s" : ""}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(ev.date_time).toLocaleString("en-PH", {
                          weekday: "short", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {ev.location}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/20 transition-colors group-hover:text-white/50" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
