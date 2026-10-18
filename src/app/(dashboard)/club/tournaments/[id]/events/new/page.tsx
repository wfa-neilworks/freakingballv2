import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EventForm } from "@/components/club/event-form";

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = await params;
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
    .select("id, name")
    .eq("id", tournamentId)
    .eq("club_id", club.id)
    .single();

  if (!tournament) redirect("/club/tournaments");

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Add Event</h1>
        <p className="text-sm text-white/50">{tournament.name}</p>
      </div>
      <EventForm tournamentId={tournament.id} />
    </div>
  );
}
