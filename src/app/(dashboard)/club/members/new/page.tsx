import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, UserPlus } from "lucide-react";
import { MemberForm } from "@/components/club/member-form";
import { BackLink } from "@/components/ui/back-button";

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const isGuest = type === "guest";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs").select("id").eq("admin_id", user!.id).single();

  if (!club) redirect("/club");

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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-lime/12">
            <UserPlus className="h-4.5 w-4.5 h-[18px] w-[18px] text-brand-lime" />
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-tight">
              Add {isGuest ? "Guest Player" : "Club Member"}
            </h1>
            <p className="text-xs text-white/35 mt-0.5">
              {isGuest
                ? "Guests can join open plays and tournaments"
                : "Add a new player to your club community"}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <MemberForm clubId={club.id} isGuest={isGuest} />
        </div>
      </div>
    </div>
  );
}
