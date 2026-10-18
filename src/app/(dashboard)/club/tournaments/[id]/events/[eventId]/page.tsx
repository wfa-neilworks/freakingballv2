export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { SessionStatus, PlayType } from "@/types/database";
import { EventManager } from "@/components/club/event-manager";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { id: tournamentId, eventId } = await params;
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
    .select("id, name, status")
    .eq("id", tournamentId)
    .eq("club_id", club.id)
    .single();

  if (!tournament) notFound();

  const { data: event } = await supabase
    .from("tournament_events")
    .select("*")
    .eq("id", eventId)
    .eq("tournament_id", tournamentId)
    .single();

  if (!event) notFound();

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, nickname, gender, is_guest")
    .eq("club_id", club.id)
    .eq("is_active", true)
    .order("full_name");

  const { data: registrations } = await supabase
    .from("tournament_registrations")
    .select("id, member_id, partner_id, pool_number")
    .eq("event_id", eventId);

  const { data: matches } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("event_id", eventId)
    .order("round_number")
    .order("court_number");

  return (
    <div>
      <div className="mb-2 text-sm text-white/40">
        <span>{tournament.name}</span>
        <span className="mx-2">/</span>
        <span className="text-white/70">{event.name}</span>
      </div>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">{event.name}</h1>
        <Badge variant={event.status as SessionStatus}>{event.status}</Badge>
      </div>
      <p className="mb-6 text-sm text-white/50 capitalize">
        {event.play_type.replace(/_/g, " ")}
        {event.doubles_category ? ` · ${event.doubles_category}` : ""}
        {" · "}{event.num_courts} court{event.num_courts > 1 ? "s" : ""}
        {" · "}{event.num_pools} pool{event.num_pools > 1 ? "s" : ""}
        {" · "}{new Date(event.date_time).toLocaleString("en-PH", {
          weekday: "short", month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        })}
        {" · "}{event.location}
      </p>

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
