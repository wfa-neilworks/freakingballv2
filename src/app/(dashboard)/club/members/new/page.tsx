export const runtime = 'edge';
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MemberForm } from "@/components/club/member-form";

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const isGuest = type === "guest";

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
        <h1 className="text-2xl font-bold text-white">
          Add {isGuest ? "Guest" : "Member"}
        </h1>
        <p className="text-sm text-white/50">
          {isGuest
            ? "Guests can join open plays and tournaments but are not club members."
            : "Add a new member to your club."}
        </p>
      </div>
      <MemberForm clubId={club.id} isGuest={isGuest} />
    </div>
  );
}
