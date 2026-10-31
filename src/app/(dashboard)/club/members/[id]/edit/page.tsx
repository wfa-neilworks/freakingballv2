export const runtime = 'edge';
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { MemberForm } from "@/components/club/member-form";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, nickname, phone, gender, is_active, is_guest, club_id, photo_url")
    .eq("id", id)
    .eq("club_id", club.id)
    .single();

  if (!member) notFound();

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Edit {member.is_guest ? "Guest" : "Member"}</h1>
        <p className="text-sm text-white/50">{member.full_name}</p>
      </div>
      <MemberForm clubId={club.id} isGuest={member.is_guest} defaultValues={member} />
    </div>
  );
}
