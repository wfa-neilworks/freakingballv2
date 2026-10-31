export const runtime = 'edge';
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EventForm } from "@/components/club/event-form";
import { CalendarPlus } from "lucide-react";

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs").select("id").eq("admin_id", user!.id).single();

  if (!club) redirect("/club");

  const { data: tournament } = await supabase
    .from("tournaments").select("id, name").eq("id", tournamentId).eq("club_id", club.id).single();

  if (!tournament) redirect("/club/tournaments");

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-lime/10">
          <CalendarPlus className="h-6 w-6 text-brand-lime" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-lime">
          {tournament.name}
        </p>
        <h1 className="mt-1 text-2xl font-black text-white">Add Event</h1>
        <p className="mt-1 text-sm text-white/40">
          Configure the play type, pools, courts and schedule.
        </p>
      </div>
      <EventForm tournamentId={tournament.id} />
    </div>
  );
}
