import { createClient } from "@/lib/supabase/server";
import { OpenPlayListClient } from "@/components/club/open-play-list-client";

export default async function OpenPlayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("admin_id", user!.id)
    .single();

  const { data: sessions } = await supabase
    .from("open_plays")
    .select("id, name, play_type, doubles_category, partner_mode, date_time, location, num_courts, status")
    .eq("club_id", club!.id)
    .order("date_time", { ascending: false });

  return (
    <OpenPlayListClient
      sessions={sessions ?? []}
      clubId={club!.id}
      adminId={user!.id}
    />
  );
}
