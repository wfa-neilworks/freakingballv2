export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Calendar, MapPin, Layers, Trophy } from "lucide-react";
import { EventManager } from "@/components/club/event-manager";

const playTypeLabel: Record<string, string> = {
  singles: "Singles",
  doubles: "Doubles",
  mixed_doubles: "Mixed Doubles",
  open_doubles: "Open Doubles",
};

const statusConfig: Record<string, { label: string; bg: string; text: string; ring: string; dot: string }> = {
  scheduled: { label: "Scheduled", bg: "bg-white/8",       text: "text-white/50",   ring: "ring-white/15",      dot: "bg-white/40" },
  active:    { label: "Active",    bg: "bg-brand-lime/12", text: "text-brand-lime", ring: "ring-brand-lime/30", dot: "bg-brand-lime" },
  completed: { label: "Completed", bg: "bg-white/5",       text: "text-white/30",   ring: "ring-white/10",      dot: "bg-white/20" },
  cancelled: { label: "Cancelled", bg: "bg-red-500/10",    text: "text-red-400",    ring: "ring-red-400/20",    dot: "bg-red-400" },
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { id: tournamentId, eventId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs").select("id").eq("admin_id", user!.id).single();

  if (!club) redirect("/club");

  const { data: tournament } = await supabase
    .from("tournaments").select("id, name, status")
    .eq("id", tournamentId).eq("club_id", club.id).single();

  if (!tournament) notFound();

  const { data: event } = await supabase
    .from("tournament_events").select("*")
    .eq("id", eventId).eq("tournament_id", tournamentId).single();

  if (!event) notFound();

  const { data: members } = await supabase
    .from("members").select("id, full_name, nickname, gender, is_guest")
    .eq("club_id", club.id).eq("is_active", true).order("full_name");

  const { data: registrations } = await supabase
    .from("tournament_registrations").select("id, member_id, partner_id, pool_number")
    .eq("event_id", eventId);

  const { data: matches } = await supabase
    .from("tournament_matches").select("*")
    .eq("event_id", eventId).order("round_number").order("court_number");

  const sc = statusConfig[event.status] ?? statusConfig.scheduled;
  const eventDate = new Date(event.date_time);

  return (
    <div className="space-y-5">

      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5">
        <Link
          href="/club/tournaments"
          className="text-xs text-white/35 transition-colors hover:text-white/60"
        >
          Tournaments
        </Link>
        <ChevronRight className="h-3 w-3 text-white/20" />
        <Link
          href={`/club/tournaments/${tournamentId}`}
          className="text-xs text-white/35 transition-colors hover:text-white/60"
        >
          {tournament.name}
        </Link>
        <ChevronRight className="h-3 w-3 text-white/20" />
        <span className="text-xs font-medium text-white/70">{event.name}</span>
      </nav>

      {/* ── Event header card ── */}
      <div className="overflow-hidden rounded-2xl border border-white/8" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)" }}>
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            {/* Left: identity */}
            <div className="flex items-start gap-4">
              {/* Icon block */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-lime/10 ring-1 ring-brand-lime/20">
                <Trophy className="h-6 w-6 text-brand-lime" />
              </div>
              <div>
                <h1 className="text-xl font-black leading-tight text-white">{event.name}</h1>
                <p className="mt-1 text-sm text-white/40">
                  <span className="capitalize">{playTypeLabel[event.play_type] ?? event.play_type}</span>
                  {event.doubles_category && (
                    <span className="ml-2 rounded-md bg-white/6 px-2 py-0.5 text-[11px] text-white/40">
                      {event.doubles_category}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-white/25">{tournament.name}</p>
              </div>
            </div>

            {/* Right: status */}
            <div className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 ${sc.bg} ${sc.text} ${sc.ring}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${event.status === "active" ? "animate-pulse" : ""}`} />
              {sc.label}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/6 bg-white/3 px-4 py-3">
              <div className="flex items-center gap-2 text-white/35">
                <Calendar className="h-3.5 w-3.5 text-brand-lime/60" />
                <span className="text-[11px] uppercase tracking-wide">Date</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-white">
                {eventDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-xs text-white/35">
                {eventDate.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="rounded-xl border border-white/6 bg-white/3 px-4 py-3">
              <div className="flex items-center gap-2 text-white/35">
                <MapPin className="h-3.5 w-3.5 text-brand-lime/60" />
                <span className="text-[11px] uppercase tracking-wide">Venue</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-white leading-tight">{event.location}</p>
            </div>

            <div className="rounded-xl border border-white/6 bg-white/3 px-4 py-3">
              <div className="flex items-center gap-2 text-white/35">
                <Layers className="h-3.5 w-3.5 text-brand-lime/60" />
                <span className="text-[11px] uppercase tracking-wide">Format</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-white">
                {event.num_courts} Court{event.num_courts > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-white/35">
                {event.num_pools} Pool{event.num_pools > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <EventManager
        event={event}
        tournamentStatus={tournament.status}
        members={members ?? []}
        initialRegistrations={registrations ?? []}
        initialMatches={matches ?? []}
      />
    </div>
  );
}
