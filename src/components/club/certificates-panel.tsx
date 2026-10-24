"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Printer, Trophy } from "lucide-react";

const PLAY_TYPE_LABELS: Record<string, string> = {
  singles:      "Singles",
  doubles:      "Doubles",
  mixed_doubles:"Mixed Doubles",
  open_doubles: "Open Doubles",
};

type TitleEntry = {
  id: string;
  title_name: string;
  awarded_at: string;
  members: { id: string; full_name: string; nickname: string | null } | { id: string; full_name: string; nickname: string | null }[] | null;
};

type TournamentMatch = {
  id: string;
  is_playoff: boolean;
  round_number: number | null;
  winner_team: number | null;
  played_at: string | null;
  team1_player1: string;
  team1_player2: string | null;
  team2_player1: string;
  team2_player2: string | null;
  team1_score: number | null;
  team2_score: number | null;
  pool_number: number | null;
};

type TournamentEvent = {
  id: string;
  name: string;
  play_type: string;
  doubles_category: string | null;
  date_time: string;
  location: string;
  titles: TitleEntry[];
  tournament_matches: TournamentMatch[];
};

type Tournament = {
  id: string;
  name: string;
  created_at: string;
  status: string;
  tournament_events: TournamentEvent[];
};

type ClubInfo = {
  name: string;
  logo_url: string | null;
  president: string | null;
  location: string | null;
};

interface Props {
  tournaments: Tournament[];
  memberMap: Record<string, { full_name: string; nickname: string | null }>;
  club: ClubInfo;
}

type MedalType = "Gold" | "Silver" | "Bronze";

const MEDAL_THEME = {
  Gold: {
    label: "Gold",
    border: "border-yellow-500/40",
    accentBg: "bg-yellow-400/10",
    accentText: "text-yellow-300",
    accentRing: "ring-yellow-400/30",
    printBorder: "#d97706",
    printAccent: "#92400e",
    printBg: "#fffbeb",
    printHeader: "#78350f",
    icon: "🥇",
  },
  Silver: {
    label: "Silver",
    border: "border-slate-400/40",
    accentBg: "bg-slate-400/10",
    accentText: "text-slate-300",
    accentRing: "ring-slate-400/30",
    printBorder: "#64748b",
    printAccent: "#334155",
    printBg: "#f8fafc",
    printHeader: "#1e293b",
    icon: "🥈",
  },
  Bronze: {
    label: "Bronze",
    border: "border-orange-500/40",
    accentBg: "bg-orange-400/10",
    accentText: "text-orange-300",
    accentRing: "ring-orange-400/30",
    printBorder: "#ea580c",
    printAccent: "#7c2d12",
    printBg: "#fff7ed",
    printHeader: "#7c2d12",
    icon: "🥉",
  },
};

interface CertData {
  medal: MedalType;
  players: string[];
  eventName: string;
  eventPlayType: string;
  eventDate: string;
  eventLocation: string;
  tournamentName: string;
  poolWins: number;
  poolLosses: number;
  poolPoints: number;
  playoffPoints: number;
  club: ClubInfo;
}

function getPlayerNames(ids: string[], memberMap: Record<string, { full_name: string; nickname: string | null }>): string[] {
  return ids.map((id) => memberMap[id]?.full_name ?? "Unknown");
}

function buildEventCerts(
  event: TournamentEvent,
  tournamentName: string,
  memberMap: Record<string, { full_name: string; nickname: string | null }>,
  club: ClubInfo
): Record<MedalType, CertData | null> {
  const result: Record<MedalType, CertData | null> = { Gold: null, Silver: null, Bronze: null };

  const playoffMatches = event.tournament_matches.filter(
    (m) => m.is_playoff && m.winner_team !== null && m.round_number !== null
  );
  if (playoffMatches.length === 0) return result;

  // Sort by round_number descending — highest = Final, second highest = Bronze match
  const sorted = [...playoffMatches].sort((a, b) => (b.round_number ?? 0) - (a.round_number ?? 0));
  const finalMatch = sorted[0];
  const bronzeMatch = sorted.find((m) => m.round_number !== finalMatch.round_number) ?? null;

  const poolMatches = event.tournament_matches.filter((m) => !m.is_playoff);

  const makePoolStats = (playerIds: string[]) => {
    let wins = 0, losses = 0, pts = 0;
    for (const m of poolMatches) {
      const team1 = [m.team1_player1, m.team1_player2].filter(Boolean) as string[];
      const team2 = [m.team2_player1, m.team2_player2].filter(Boolean) as string[];
      const onTeam1 = playerIds.some((id) => team1.includes(id));
      const onTeam2 = playerIds.some((id) => team2.includes(id));
      if (!onTeam1 && !onTeam2) continue;
      if (m.winner_team === null) continue;
      const won = (onTeam1 && m.winner_team === 1) || (onTeam2 && m.winner_team === 2);
      if (won) wins++; else losses++;
      const myScore = onTeam1 ? (m.team1_score ?? 0) : (m.team2_score ?? 0);
      pts += myScore;
    }
    return { wins, losses, pts };
  };

  const makePlayoffPoints = (playerIds: string[]) => {
    let pts = 0;
    for (const m of playoffMatches) {
      const team1 = [m.team1_player1, m.team1_player2].filter(Boolean) as string[];
      const team2 = [m.team2_player1, m.team2_player2].filter(Boolean) as string[];
      const onTeam1 = playerIds.some((id) => team1.includes(id));
      const onTeam2 = playerIds.some((id) => team2.includes(id));
      if (!onTeam1 && !onTeam2) continue;
      const myScore = onTeam1 ? (m.team1_score ?? 0) : (m.team2_score ?? 0);
      pts += myScore;
    }
    return pts;
  };

  const buildCert = (medal: MedalType, playerIds: string[]): CertData => {
    const players = getPlayerNames(playerIds, memberMap);
    const pool = makePoolStats(playerIds);
    const playoffPts = makePlayoffPoints(playerIds);
    return {
      medal,
      players,
      eventName: event.name,
      eventPlayType: PLAY_TYPE_LABELS[event.play_type] ?? event.play_type,
      eventDate: new Date(event.date_time).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }),
      eventLocation: event.location,
      tournamentName,
      poolWins: pool.wins,
      poolLosses: pool.losses,
      poolPoints: pool.pts,
      playoffPoints: playoffPts,
      club,
    };
  };

  // Gold = winner of Final, Silver = loser of Final
  const goldIds = finalMatch.winner_team === 1
    ? [finalMatch.team1_player1, finalMatch.team1_player2].filter(Boolean) as string[]
    : [finalMatch.team2_player1, finalMatch.team2_player2].filter(Boolean) as string[];
  const silverIds = finalMatch.winner_team === 1
    ? [finalMatch.team2_player1, finalMatch.team2_player2].filter(Boolean) as string[]
    : [finalMatch.team1_player1, finalMatch.team1_player2].filter(Boolean) as string[];

  result.Gold   = buildCert("Gold",   goldIds);
  result.Silver = buildCert("Silver", silverIds);

  if (bronzeMatch) {
    const bronzeIds = bronzeMatch.winner_team === 1
      ? [bronzeMatch.team1_player1, bronzeMatch.team1_player2].filter(Boolean) as string[]
      : [bronzeMatch.team2_player1, bronzeMatch.team2_player2].filter(Boolean) as string[];
    result.Bronze = buildCert("Bronze", bronzeIds);
  }

  return result;
}

function printCertificate(cert: CertData) {
  const theme = MEDAL_THEME[cert.medal];
  const playerNames = cert.players.map((p) =>
    `<div style="font-size:28px;font-weight:bold;color:${theme.printHeader};border-bottom:2px solid ${theme.printBorder}66;display:inline-block;padding:0 40px 6px;margin-bottom:6px">${p}</div>`
  ).join("<br/>");

  const logoHtml = cert.club.logo_url
    ? `<img src="${cert.club.logo_url}" alt="logo" style="width:60px;height:60px;border-radius:10px;object-fit:cover;" />`
    : "";

  const standingRow = (label: string, value: string | number) =>
    `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid ${theme.printBorder}22">
      <span style="color:#6b7280;font-size:11px">${label}</span>
      <span style="font-weight:bold;color:${theme.printHeader};font-size:12px">${value}</span>
    </div>`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${cert.medal} Certificate — ${cert.players.join(" & ")}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: white; display: flex; align-items: center; justify-content: center; min-height: 210mm; }
    .cert {
      width: 277mm; min-height: 190mm; background: ${theme.printBg};
      border: 3px solid ${theme.printBorder}; border-radius: 14px;
      padding: 36px 52px; font-family: Georgia, serif; position: relative;
    }
    .corner-border {
      position: absolute; top: 8px; left: 8px; right: 8px; bottom: 8px;
      border: 2px solid ${theme.printBorder}33; border-radius: 10px; pointer-events: none;
    }
    .divider { height: 2px; background: linear-gradient(to right, transparent, ${theme.printBorder}, transparent); margin: 0 0 20px; }
    .divider-light { height: 1px; background: linear-gradient(to right, transparent, ${theme.printBorder}66, transparent); margin: 0 0 18px; }
    .two-col { display: flex; gap: 40px; align-items: flex-start; }
    .main-col { flex: 1; }
    .stats-col { width: 180px; background: ${theme.printBorder}0d; border: 1px solid ${theme.printBorder}33; border-radius: 8px; padding: 14px 16px; }
  </style>
</head>
<body>
<div class="cert">
  <div class="corner-border"></div>
  <div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:18px">
    ${logoHtml}
    <div style="text-align:center">
      <div style="font-size:20px;font-weight:bold;color:${theme.printHeader};letter-spacing:1px;text-transform:uppercase">${cert.club.name}</div>
      ${cert.club.location ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${cert.club.location}</div>` : ""}
    </div>
  </div>
  <div class="divider"></div>
  <div class="two-col">
    <div class="main-col">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:${theme.printAccent};margin-bottom:4px">Certificate of Achievement</div>
        <div style="font-size:40px;font-weight:bold;color:${theme.printBorder};line-height:1">${theme.icon} ${theme.label} Medal</div>
      </div>
      <div style="text-align:center;font-size:12px;color:#6b7280;margin-bottom:12px">This is to certify that</div>
      <div style="text-align:center;margin-bottom:16px">${playerNames}</div>
      <div style="text-align:center;font-size:12px;color:#6b7280;line-height:1.7">
        has achieved <strong style="color:${theme.printAccent}">${theme.label} Place</strong> in the<br/>
        <strong style="color:${theme.printHeader};font-size:14px">${cert.eventName}</strong> — ${cert.eventPlayType}<br/>
        <span style="font-size:11px">held at ${cert.eventLocation} on ${cert.eventDate}</span><br/>
        <span style="font-size:11px">as part of <em>${cert.tournamentName}</em></span>
      </div>
    </div>
    <div class="stats-col">
      <div style="font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${theme.printAccent};margin-bottom:10px;text-align:center">Tournament Stats</div>
      <div style="font-size:10px;font-weight:bold;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Elimination Round</div>
      ${standingRow("Wins", cert.poolWins)}
      ${standingRow("Losses", cert.poolLosses)}
      ${standingRow("Points", cert.poolPoints)}
      <div style="margin-top:12px;font-size:10px;font-weight:bold;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Playoffs</div>
      ${standingRow("Points", cert.playoffPoints)}
      <div style="margin-top:10px;padding-top:10px;border-top:2px solid ${theme.printBorder}33">
        ${standingRow("Total Points", cert.poolPoints + cert.playoffPoints)}
      </div>
    </div>
  </div>
  <div style="margin-top:20px" class="divider-light"></div>
  <div style="display:flex;justify-content:center">
    <div style="text-align:center;min-width:200px">
      <div style="height:38px;border-bottom:1px solid ${theme.printAccent}88;margin-bottom:4px"></div>
      <div style="font-size:12px;font-weight:bold;color:${theme.printHeader}">${cert.club.president ?? "Club President"}</div>
      <div style="font-size:10px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase">Club President</div>
    </div>
  </div>
</div>
<script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

export function CertificatesPanel({ tournaments, memberMap, club }: Props) {
  const [expandedTournamentId, setExpandedTournamentId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  if (tournaments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
        <Trophy className="mb-3 h-8 w-8 text-white/20" />
        <p className="text-sm text-white/30">No tournaments yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tournaments.map((t) => {
        const isOpen = expandedTournamentId === t.id;
        const eventCount = t.tournament_events?.length ?? 0;
        const completedEvents = (t.tournament_events ?? []).filter((ev) =>
          (ev.titles ?? []).length > 0
        );

        return (
          <div key={t.id} className="overflow-hidden rounded-2xl border border-white/8 bg-white/3">
            <button
              onClick={() => {
                setExpandedTournamentId(isOpen ? null : t.id);
                setExpandedEventId(null);
              }}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{t.name}</p>
                <p className="text-xs text-white/35">
                  {new Date(t.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  {" · "}{eventCount} event{eventCount !== 1 ? "s" : ""}
                  {completedEvents.length > 0 && <span className="ml-1 text-brand-lime/60">· {completedEvents.length} with medals</span>}
                </p>
              </div>
              {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-white/30" /> : <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />}
            </button>

            {isOpen && (
              <div className="border-t border-white/6">
                {(t.tournament_events ?? []).length === 0 && (
                  <p className="px-5 py-4 text-sm text-white/30">No events in this tournament</p>
                )}
                {(t.tournament_events ?? []).map((ev) => {
                  const certs = buildEventCerts(ev, t.name, memberMap, club);
                  const hasMedals = certs.Gold || certs.Silver || certs.Bronze;
                  const evOpen = expandedEventId === ev.id;

                  return (
                    <div key={ev.id} className="border-b border-white/5 last:border-0">
                      <button
                        onClick={() => setExpandedEventId(evOpen ? null : ev.id)}
                        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/3"
                      >
                        <div className="min-w-0 flex-1 pl-2">
                          <p className={`text-sm font-medium ${hasMedals ? "text-white" : "text-white/40"}`}>{ev.name}</p>
                          <p className="text-xs text-white/25">
                            {PLAY_TYPE_LABELS[ev.play_type] ?? ev.play_type}
                            {" · "}{new Date(ev.date_time).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                            {!hasMedals && <span className="ml-1 italic">· no medals yet</span>}
                          </p>
                        </div>
                        {hasMedals && (
                          <div className="flex gap-1 text-sm">
                            {certs.Gold   && <span>🥇</span>}
                            {certs.Silver && <span>🥈</span>}
                            {certs.Bronze && <span>🥉</span>}
                          </div>
                        )}
                        {hasMedals && (evOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-white/25" /> : <ChevronRight className="h-4 w-4 shrink-0 text-white/15" />)}
                      </button>

                      {evOpen && hasMedals && (
                        <div className="space-y-2 bg-white/[0.015] px-5 pb-4 pt-2 pl-9">
                          {(["Gold", "Silver", "Bronze"] as MedalType[])
                            .filter((medal) => !!certs[medal])
                            .map((medal) => {
                              const cert = certs[medal]!;
                              const theme = MEDAL_THEME[medal];
                              return (
                                <div key={medal} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${theme.border} ${theme.accentBg}`}>
                                  <span className="text-xl">{theme.icon}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-semibold ${theme.accentText}`}>{theme.label}</p>
                                    <p className="text-xs text-white/50">{cert.players.join(" & ")}</p>
                                  </div>
                                  <button
                                    onClick={() => printCertificate(cert)}
                                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition ${theme.accentBg} ${theme.accentText} ${theme.accentRing} hover:brightness-125`}
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                    Print
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
