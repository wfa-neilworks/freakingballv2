
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EventManager } from "@/components/club/event-manager";
import { EventHeaderCard } from "@/components/club/event-header-card";

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
      <EventHeaderCard
        event={event}
        tournamentName={tournament.name}
        sc={sc}
        eventDate={eventDate}
        playTypeLabel={playTypeLabel}
      />

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
