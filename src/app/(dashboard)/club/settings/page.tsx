export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClubSettingsForm } from "@/components/club/club-settings-form";

export default async function ClubSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, description, location, logo_url")
    .eq("admin_id", user!.id)
    .single();

  if (!club) redirect("/club");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">Club Settings</h1>
        <p className="mt-0.5 text-sm text-white/40">Update your club profile and logo</p>
      </div>
      <ClubSettingsForm club={club} userId={user!.id} />
    </div>
  );
}
