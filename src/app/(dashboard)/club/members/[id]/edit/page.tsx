import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, UserCog } from "lucide-react";
import { MemberForm } from "@/components/club/member-form";
import { BackLink } from "@/components/ui/back-button";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs").select("id").eq("admin_id", user!.id).single();

  if (!club) redirect("/club");

  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, nickname, phone, gender, is_active, is_guest, club_id, photo_url")
    .eq("id", id)
    .eq("club_id", club.id)
    .single();

  if (!member) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back */}
      <div className="mb-6">
        <BackLink href="/club/members" label="Members" />
      </div>

      {/* Panel */}
      <div
        className="rounded-2xl border border-white/[0.07]"
        style={{ background: "rgba(255,255,255,0.035)" }}
      >
        {/* Panel header */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/12">
            <UserCog className="h-[18px] w-[18px] text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-tight">
              Edit {member.is_guest ? "Guest" : "Member"}
            </h1>
            <p className="text-xs text-white/35 mt-0.5">{member.full_name}</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <MemberForm
            clubId={club.id}
            isGuest={member.is_guest}
            defaultValues={{
              id: member.id,
              full_name: member.full_name,
              nickname: member.nickname,
              phone: member.phone,
              gender: member.gender,
              is_active: member.is_active,
              photo_url: (member as any).photo_url ?? null,
            }}
          />
        </div>
      </div>
    </div>
  );
}
