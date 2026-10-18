import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OpenPlayForm } from "@/components/club/open-play-form";

export default async function NewOpenPlayPage() {
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
        <h1 className="text-2xl font-bold text-white">New Open Play Session</h1>
        <p className="text-sm text-white/50">Set up the session details</p>
      </div>
      <OpenPlayForm clubId={club.id} adminId={user!.id} />
    </div>
  );
}
