import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ChevronRight, Calendar, MapPin, CheckCircle2, Circle } from "lucide-react";
import type { SessionStatus, TournamentStatus } from "@/types/database";
import { TournamentStatusActions } from "@/components/club/tournament-status-actions";

const playTypeLabel: Record<string, string> = {
  singles: "Singles",
  doubles: "Doubles",
  mixed_doubles: "Mixed Doubles",
  open_doubles: "Open Doubles",
};

const STATUS_LABEL: Record<TournamentStatus, string> = {
  draft: "Draft",
  registration: "Reg.",
  active: "Active",
  completed: "Completed",
};

const STATUS_PILL: Record<TournamentStatus, string> = {
  draft:        "bg-white/10 text-white/50 border border-white/15",
  registration: "bg-blue-500/15 text-blue-300 border border-blue-400/25",
  active:       "bg-brand-lime/15 text-brand-lime border border-brand-lime/30",
  completed:    "bg-brand-lime/15 text-brand-lime border border-brand-lime/30",
};

const EVENT_STATUS_PILL: Record<string, string> = {
  scheduled: "bg-white/8 text-white/40 border border-white/12",
  active:    "bg-brand-lime/15 text-brand-lime border border-brand-lime/30",
  completed: "bg-brand-lime/15 text-brand-lime border border-brand-lime/30",
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
  const statusPill = STATUS_PILL[tournament.status as TournamentStatus] ?? STATUS_PILL.draft;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white">{tournament.name}</h1>
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusPill}`}>
              {tournament.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
              {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/40">
            {eventCount} event{eventCount !== 1 ? "s" : ""}
          </p>
        </div>
        {tournament.status !== "completed" && (
          <Link
            href={`/club/tournaments/${id}/events/new`}
            className="flex items-center gap-2 rounded-2xl bg-brand-lime px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-lime/90"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </Link>
        )}
      </div>

      {/* Status pipeline */}
      <div className="rounded-2xl border border-white/15 bg-[#0f1e14] p-5">
        <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/30">
          Tournament Status
        </p>
        <div className="flex items-center">
          {statusFlow.map((s, i) => {
            const done    = i <= currentIdx;
            const current = i === currentIdx;
            const label   = STATUS_LABEL[s];
            return (
              <div key={s} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                    done
                      ? "border-brand-lime bg-brand-lime/20 text-brand-lime"
                      : "border-white/15 bg-white/5 text-white/25"
                  }`}>
                    {done
                      ? <CheckCircle2 className="h-5 w-5 text-brand-lime" />
                      : <span className="text-xs font-bold text-white/30">{i + 1}</span>
                    }
                  </div>
                  <span className={`text-center text-xs font-semibold leading-tight ${
                    current ? "font-black text-white" : done ? "text-brand-lime/80" : "text-white/25"
                  }`}>
                    {label}
                  </span>
                </div>
                {i < statusFlow.length - 1 && (
                  <div className={`mb-5 h-0.5 flex-1 ${i < currentIdx ? "bg-brand-lime/60" : "bg-white/10"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Status message */}
        <div className="mt-4 border-t border-white/8 pt-4">
          <TournamentStatusActions
            tournamentId={tournament.id}
            currentStatus={tournament.status as TournamentStatus}
          />
        </div>
      </div>

      {/* Events */}
      <div>
        <h2 className="mb-3 text-xl font-black text-white">Events</h2>

        {!eventCount && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-14 text-center">
            <p className="text-sm text-white/30">No events yet</p>
            {tournament.status !== "completed" && (
              <Link
                href={`/club/tournaments/${id}/events/new`}
                className="mt-4 flex items-center gap-2 rounded-2xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                <Plus className="h-4 w-4" />
                Add First Event
              </Link>
            )}
          </div>
        )}

        {eventCount > 0 && (
          <div className="space-y-2">
            {events!.map((ev) => {
              const evPill = EVENT_STATUS_PILL[ev.status as string] ?? EVENT_STATUS_PILL.scheduled;
              return (
                <Link key={ev.id} href={`/club/tournaments/${id}/events/${ev.id}`}>
                  <div className="group rounded-2xl border border-white/15 bg-[#0f1e14] px-5 py-4 transition-all hover:border-brand-lime/30 hover:bg-[#122018]">
                    {/* Name + status */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <p className="font-bold text-white transition-colors group-hover:text-brand-lime">
                          {ev.name}
                        </p>
                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${evPill}`}>
                          {ev.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                          {(ev.status as string).charAt(0).toUpperCase() + (ev.status as string).slice(1)}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/20 transition-colors group-hover:text-white/50" />
                    </div>

                    {/* Details */}
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-white/45">
                        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 010 20M2 12h20"/></svg>
                        <span>
                          {playTypeLabel[ev.play_type] ?? ev.play_type}
                          {" · "}{ev.num_courts} court{ev.num_courts > 1 ? "s" : ""}
                          {" · "}{ev.num_pools} pool{ev.num_pools > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/45">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {new Date(ev.date_time).toLocaleString("en-PH", {
                            weekday: "short", month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/45">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{ev.location}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
