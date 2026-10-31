export const runtime = 'edge';

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClubSettingsForm } from "@/components/club/club-settings-form";
import { CertificatesPanel } from "@/components/club/certificates-panel";

type Tab = "settings" | "certificates";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: Tab = tab === "certificates" ? "certificates" : "settings";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, description, location, logo_url, president")
    .eq("admin_id", user!.id)
    .single();

  if (!club) redirect("/club");

  // For certificates: fetch all tournaments with their events and medal winners
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select(`
      id, name, created_at, status,
      tournament_events(
        id, name, play_type, doubles_category, date_time, location,
        titles(
          id, title_name, awarded_at,
          members(id, full_name, nickname)
        ),
        tournament_matches(
          id, is_playoff, round_number, winner_team, played_at,
          team1_player1, team1_player2, team2_player1, team2_player2,
          team1_score, team2_score, pool_number
        )
      )
    `)
    .eq("club_id", club.id)
    .order("created_at", { ascending: false });

  // Fetch members for player name lookup
  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, nickname")
    .eq("club_id", club.id);

  const memberMap: Record<string, { full_name: string; nickname: string | null }> = {};
  for (const m of members ?? []) memberMap[m.id] = m;

  const tabs = [
    { key: "settings",     label: "Club Settings" },
    { key: "certificates", label: "Certificates" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Admin Section</h1>
        <p className="mt-0.5 text-sm text-white/40">Manage your club and generate certificates</p>
      </div>

      {/* Tab ribbon */}
      <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-white/10 bg-white/3">
        {tabs.map((t, i) => (
          <Link
            key={t.key}
            href={`/club/admin${t.key !== "settings" ? `?tab=${t.key}` : ""}`}
            className={`relative flex flex-col items-center gap-1 py-4 text-sm font-semibold transition-all ${
              i === 0 ? "border-r border-white/10" : ""
            } ${
              activeTab === t.key
                ? "bg-brand-lime text-brand-dark"
                : "text-white/40 hover:bg-white/5 hover:text-white"
            }`}
          >
            {t.label}
            {activeTab === t.key && (
              <div className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-brand-dark/30" />
            )}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "settings" && (
        <ClubSettingsForm club={club} userId={user!.id} />
      )}

      {activeTab === "certificates" && (
        <CertificatesPanel
          tournaments={tournaments ?? []}
          memberMap={memberMap}
          club={{
            name: club.name,
            logo_url: club.logo_url,
            president: club.president,
            location: club.location,
          }}
        />
      )}
    </div>
  );
}
