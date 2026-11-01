import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function ClubDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("admin_id", user!.id)
    .single();

  const clubId = club!.id;

  const [
    { count: memberCount },
    { count: guestCount },
    { count: openPlayCount },
    { count: tournamentCount },
    { data: recentSessions },
    { data: recentTournaments },
  ] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }).eq("club_id", clubId).eq("is_guest", false).eq("is_active", true),
    supabase.from("members").select("*", { count: "exact", head: true }).eq("club_id", clubId).eq("is_guest", true),
    supabase.from("open_plays").select("*", { count: "exact", head: true }).eq("club_id", clubId).eq("status", "active"),
    supabase.from("tournaments").select("*", { count: "exact", head: true }).eq("club_id", clubId).neq("status", "completed"),
    supabase.from("open_plays")
      .select("id, name, status, date_time, location, play_type")
      .eq("club_id", clubId)
      .order("date_time", { ascending: false })
      .limit(4),
    supabase.from("tournaments")
      .select("id, name, status, created_at, tournament_events(id)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const sessions = (recentSessions ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    date_time: s.date_time,
    location: s.location,
    play_type: s.play_type,
  }));

  const tournaments = (recentTournaments ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    status: t.status,
    created_at: t.created_at,
    event_count: Array.isArray(t.tournament_events) ? t.tournament_events.length : 0,
  }));

  return (
    <DashboardClient
      data={{
        clubName: club!.name,
        memberCount: memberCount ?? 0,
        guestCount: guestCount ?? 0,
        openPlayCount: openPlayCount ?? 0,
        tournamentCount: tournamentCount ?? 0,
        recentSessions: sessions,
        recentTournaments: tournaments,
      }}
    />
  );
}
