export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ChevronRight, Calendar, MapPin } from "lucide-react";
import type { SessionStatus, PlayType } from "@/types/database";
import { EventManager } from "@/components/club/event-manager";

const playTypeLabel: Record<string, string> = {
  singles: "Singles",
  doubles: "Doubles",
  mixed_doubles: "Mixed Doubles",
  open_doubles: "Open Doubles",
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-white/35">
        <Link href="/club/tournaments" className="hover:text-white/60 transition-colors">Tournaments</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/club/tournaments/${tournamentId}`} className="hover:text-white/60 transition-colors">{tournament.name}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white/60">{event.name}</span>
      </div>

      {/* Event header card */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">{event.name}</h1>
              <Badge variant={event.status as SessionStatus}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
              <span className="font-medium text-white/60 capitalize">
                {playTypeLabel[event.play_type] ?? event.play_type}
                {event.doubles_category ? ` · ${event.doubles_category}` : ""}
              </span>
              <span>{event.num_courts} court{event.num_courts > 1 ? "s" : ""}</span>
              <span>{event.num_pools} pool{event.num_pools > 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(event.date_time).toLocaleString("en-PH", {
                  weekday: "short", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
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
