import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TournamentForm } from "@/components/club/tournament-form";

export default async function NewTournamentPage() {
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

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">New Tournament</h1>
        <p className="text-sm text-white/50">Create a tournament and add events to it</p>
      </div>
      <TournamentForm clubId={club.id} adminId={user!.id} />
    </div>
  );
}
