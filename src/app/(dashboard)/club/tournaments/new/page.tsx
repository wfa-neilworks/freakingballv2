import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TournamentForm } from "@/components/club/tournament-form";
import { Trophy } from "lucide-react";

export default async function NewTournamentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs").select("id").eq("admin_id", user!.id).single();

  if (!club) redirect("/club");

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-lime/10">
          <Trophy className="h-6 w-6 text-brand-lime" />
        </div>
        <h1 className="text-2xl font-black text-white">New Tournament</h1>
        <p className="mt-1 text-sm text-white/40">
          Give your tournament a name — you&apos;ll add events after.
        </p>
      </div>
      <TournamentForm clubId={club.id} adminId={user!.id} />
    </div>
  );
}
