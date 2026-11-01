import { createClient } from "@/lib/supabase/server";
import { MembersListClient } from "@/components/club/members-list-client";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const isGuests = tab === "guests";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs").select("id").eq("admin_id", user!.id).single();

  const clubId = club!.id;

  let query = supabase
    .from("members")
    .select("id, full_name, nickname, phone, gender, is_active, photo_url")
    .eq("club_id", clubId)
    .eq("is_guest", isGuests)
    .order("full_name");

  if (q) query = query.ilike("full_name", `%${q}%`);

  const [
    { data: members },
    { count: totalMembers },
    { count: activeMembers },
    { count: inactiveMembers },
    { count: totalGuests },
  ] = await Promise.all([
    query,
    supabase.from("members").select("*", { count: "exact", head: true }).eq("club_id", clubId).eq("is_guest", false),
    supabase.from("members").select("*", { count: "exact", head: true }).eq("club_id", clubId).eq("is_guest", false).eq("is_active", true),
    supabase.from("members").select("*", { count: "exact", head: true }).eq("club_id", clubId).eq("is_guest", false).eq("is_active", false),
    supabase.from("members").select("*", { count: "exact", head: true }).eq("club_id", clubId).eq("is_guest", true),
  ]);

  return (
    <MembersListClient
      members={members ?? []}
      stats={{
        total:    totalMembers    ?? 0,
        active:   activeMembers   ?? 0,
        inactive: inactiveMembers ?? 0,
        guests:   totalGuests     ?? 0,
      }}
      isGuests={isGuests}
      searchQuery={q ?? ""}
      clubId={clubId}
    />
  );
}
