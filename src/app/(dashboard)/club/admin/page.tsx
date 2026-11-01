
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Award } from "lucide-react";
import { ClubSettingsForm } from "@/components/club/club-settings-form";
import { CertificatesPanel } from "@/components/club/certificates-panel";

type Tab = "settings" | "certificates";

const TABS = [
  { key: "settings" as const,     label: "Club Settings",  icon: Settings },
  { key: "certificates" as const, label: "Certificates",   icon: Award },
];

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

  const { data: members } = await supabase
    .from("members")
    .select("id, full_name, nickname")
    .eq("club_id", club.id);

  const memberMap: Record<string, { full_name: string; nickname: string | null }> = {};
  for (const m of members ?? []) memberMap[m.id] = m;

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(183,255,114,0.1)" }}>
          <Settings className="h-5 w-5 text-brand-lime" />
        </div>
        <div>
          <h1 className="text-xl font-black leading-tight text-white">Admin</h1>
          <p className="text-xs text-white/35">Manage your club settings and certificates</p>
        </div>
      </div>

      {/* ── Tab strip ─────────────────────────────────────────── */}
      <div
        className="flex overflow-hidden rounded-xl border border-white/[0.07] p-1"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <Link
              key={t.key}
              href={`/club/admin${t.key !== "settings" ? `?tab=${t.key}` : ""}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-150"
              style={{
                background: active ? "#b7ff72" : "transparent",
                color: active ? "#18251D" : "rgba(255,255,255,0.35)",
              }}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* ── Tab content ───────────────────────────────────────── */}
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
