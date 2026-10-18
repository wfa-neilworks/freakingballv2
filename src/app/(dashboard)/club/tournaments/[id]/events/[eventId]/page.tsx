export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Calendar, MapPin, Layers, Award } from "lucide-react";
import type { SessionStatus } from "@/types/database";
import { EventManager } from "@/components/club/event-manager";

const playTypeLabel: Record<string, string> = {
  singles: "Singles",
  doubles: "Doubles",
  mixed_doubles: "Mixed Doubles",
  open_doubles: "Open Doubles",
};

const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
  scheduled: { bg: "bg-white/10",       text: "text-white/60",   dot: "bg-white/40" },
  active:    { bg: "bg-brand-lime/15",   text: "text-brand-lime", dot: "bg-brand-lime" },
  completed: { bg: "bg-white/5",         text: "text-white/30",   dot: "bg-white/20" },
  cancelled: { bg: "bg-red-500/10",      text: "text-red-400",    dot: "bg-red-400" },
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

  const ss = statusStyle[event.status] ?? statusStyle.scheduled;

  return (
    <div className="space-y-5">

      {/* ── Breadcrumb nav — pill-arrow style ── */}
      <nav className="flex items-center">
        {/* Step 1: Tournaments */}
        <Link
          href="/club/tournaments"
          className="group flex items-center"
        >
          <div className="flex h-9 items-center rounded-l-full border border-white/10 bg-white/5 pl-4 pr-3 text-xs text-white/40 transition-colors group-hover:bg-white/10 group-hover:text-white/70">
            Tournaments
          </div>
          {/* Arrow wedge */}
          <div className="relative -ml-px h-9 w-5 overflow-hidden">
            <div className="absolute inset-0 border-y border-r border-white/10 bg-white/5 transition-colors group-hover:bg-white/10"
              style={{ clipPath: "polygon(0 0, 60% 0, 100% 50%, 60% 100%, 0 100%, 40% 50%)" }}
            />
          </div>
        </Link>

        {/* Step 2: Tournament name */}
        <Link
          href={`/club/tournaments/${tournamentId}`}
          className="group -ml-px flex items-center"
        >
          <div className="flex h-9 items-center border border-white/10 bg-white/5 pl-5 pr-3 text-xs text-white/40 transition-colors group-hover:bg-white/10 group-hover:text-white/70">
            {tournament.name}
          </div>
          <div className="relative -ml-px h-9 w-5 overflow-hidden">
            <div className="absolute inset-0 border-y border-r border-white/10 bg-white/5 transition-colors group-hover:bg-white/10"
              style={{ clipPath: "polygon(0 0, 60% 0, 100% 50%, 60% 100%, 0 100%, 40% 50%)" }}
            />
          </div>
        </Link>

        {/* Step 3: Event name — active/current */}
        <div className="-ml-px flex h-9 items-center rounded-r-full border border-brand-lime/40 bg-brand-lime/10 pl-5 pr-5 text-xs font-semibold text-brand-lime">
          {event.name}
        </div>
      </nav>

      {/* ── Event info card ── */}
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-brand-lime/60 via-brand-lime to-brand-lime/20" />

        <div className="p-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">{event.name}</h1>
              <p className="mt-0.5 text-sm text-white/40 capitalize">
                {playTypeLabel[event.play_type] ?? event.play_type}
                {event.doubles_category ? ` · ${event.doubles_category}` : ""}
              </p>
            </div>
            {/* Status badge */}
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${ss.bg} ${ss.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${ss.dot} ${event.status === "active" ? "animate-pulse" : ""}`} />
              {(event.status as string).charAt(0).toUpperCase() + (event.status as string).slice(1)}
            </div>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-white/6" />

          {/* Detail pills */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-white/60">
              <MapPin className="h-3.5 w-3.5 text-brand-lime/70" />
              {event.location}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-white/60">
              <Calendar className="h-3.5 w-3.5 text-brand-lime/70" />
              {new Date(event.date_time).toLocaleString("en-PH", {
                weekday: "short", month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-white/60">
              <Layers className="h-3.5 w-3.5 text-brand-lime/70" />
              {event.num_courts} court{event.num_courts > 1 ? "s" : ""}
              <span className="text-white/20">·</span>
              {event.num_pools} pool{event.num_pools > 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-xs text-white/60">
              <Award className="h-3.5 w-3.5 text-brand-lime/70" />
              {tournament.name}
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
