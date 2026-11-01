import { createClient } from "@/lib/supabase/server";
import { TournamentsListClient } from "@/components/club/tournaments-list-client";

export default async function TournamentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("admin_id", user!.id)
    .single();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, status, created_at, tournament_events(id)")
    .eq("club_id", club!.id)
    .order("created_at", { ascending: false });

  return (
    <TournamentsListClient
      tournaments={tournaments ?? []}
      clubId={club!.id}
      adminId={user!.id}
    />
  );
}
