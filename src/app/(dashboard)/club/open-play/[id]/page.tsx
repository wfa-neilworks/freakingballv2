import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { OpenPlayManager } from "@/components/club/open-play-manager";
import { OpenPlayQR } from "@/components/club/open-play-qr";
import type { SessionStatus } from "@/types/database";

export default async function OpenPlayDetailPage({
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

  const { data: session } = await supabase
    .from("open_plays")
    .select("*")
    .eq("id", id)
    .eq("club_id", club.id)
    .single();

  if (!session) notFound();

  // All active club members and guests
  const { data: allMembers } = await supabase
    .from("members")
    .select("id, full_name, nickname, gender, is_guest, photo_url")
    .eq("club_id", club.id)
    .eq("is_active", true)
    .order("full_name");

  // Current participants
  const { data: participants } = await supabase
    .from("open_play_participants")
    .select("member_id")
    .eq("open_play_id", id);

  // All rounds and matches
  const { data: matches } = await supabase
    .from("open_play_matches")
    .select("*")
    .eq("open_play_id", id)
    .order("round_number")
    .order("court_number");

  const participantIds = new Set(participants?.map((p) => p.member_id) ?? []);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{session.name}</h1>
          <Badge variant={session.status as SessionStatus}>{session.status}</Badge>
          <OpenPlayQR sessionId={session.id} />
        </div>
        <p className="mt-1 text-sm text-white/50 capitalize">
          {session.play_type.replace(/_/g, " ")}
          {session.doubles_category ? ` · ${session.doubles_category}` : ""}
          {session.partner_mode ? ` · ${session.partner_mode} partners` : ""}
          {" · "}
          {session.num_courts} court{session.num_courts > 1 ? "s" : ""}
          {" · "}
          {new Date(session.date_time).toLocaleString("en-PH", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <OpenPlayManager
        session={session}
        allMembers={allMembers ?? []}
        participantIds={[...participantIds]}
        matches={matches ?? []}
      />
    </div>
  );
}
