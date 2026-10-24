"use client";

import { useState, useRef } from "react";
import { ChevronRight, ChevronDown, Printer, Trophy, Medal } from "lucide-react";
import Image from "next/image";

const PLAY_TYPE_LABELS: Record<string, string> = {
  singles:      "Singles",
  doubles:      "Doubles",
  mixed_doubles:"Mixed Doubles",
  open_doubles: "Open Doubles",
};

type Member = { id: string; full_name: string; nickname: string | null };

type TitleEntry = {
  id: string;
  title_name: string;
  awarded_at: string;
  members: Member | Member[] | null;
};

type TournamentMatch = {
  id: string;
  is_playoff: boolean;
  winner_team: number | null;
  played_at: string | null;
  team1_player1: string;
  team1_player2: string | null;
  team2_player1: string;
  team2_player2: string | null;
  team1_score: number | null;
  team2_score: number | null;
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
    gradient: "from-yellow-900/60 via-yellow-800/40 to-yellow-900/60",
    border: "border-yellow-500/40",
    accent: "#F59E0B",
    accentLight: "#FDE68A",
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
    gradient: "from-slate-700/60 via-slate-600/40 to-slate-700/60",
    border: "border-slate-400/40",
    accent: "#94A3B8",
    accentLight: "#E2E8F0",
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
    gradient: "from-orange-900/60 via-orange-800/40 to-orange-900/60",
    border: "border-orange-500/40",
    accent: "#F97316",
    accentLight: "#FED7AA",
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
  players: string[];          // display names
  eventName: string;
  eventPlayType: string;
  eventDate: string;
  eventLocation: string;
  tournamentName: string;
  score: string;
  pointsEarned: number;
  club: ClubInfo;
}

function getMember(m: Member | Member[] | null): Member | null {
  if (!m) return null;
  return Array.isArray(m) ? m[0] : m;
}

function buildCertData(
  title: TitleEntry,
  event: TournamentEvent,
  tournamentName: string,
  memberMap: Record<string, { full_name: string; nickname: string | null }>,
  club: ClubInfo
): CertData | null {
  const member = getMember(title.members);
  if (!member) return null;

  const medal = title.title_name as MedalType;
  if (!MEDAL_THEME[medal]) return null;

  // Find the playoff match this player was in
  const playoffMatches = event.tournament_matches.filter((m) => m.is_playoff && m.winner_team !== null);
  const maxRound = playoffMatches.length > 0 ? Math.max(...playoffMatches.map((m) => {
    // determine round by filtering only among playoff matches
    return 0; // we'll use a different approach below
  })) : 0;

  // Find which match gave this player their title
  let score = "";
  let pointsEarned = 0;
  let players: string[] = [member.full_name];

  const isDoubles = event.play_type !== "singles";

  // For doubles: find partner from the same match
  for (const match of playoffMatches) {
    const team1 = [match.team1_player1, match.team1_player2].filter(Boolean) as string[];
    const team2 = [match.team2_player1, match.team2_player2].filter(Boolean) as string[];
    const winners = match.winner_team === 1 ? team1 : team2;
    const losers  = match.winner_team === 1 ? team2 : team1;

    if (medal === "Gold" || medal === "Silver") {
      // Final match — highest round among playoffs
      const allPlayoffRounds = playoffMatches.map((m2) => {
        // Determine round number by match index — use played_at or id ordering
        return 0;
      });
    }

    const myTeam = winners.includes(member.id) ? winners : losers.includes(member.id) ? losers : null;
    if (!myTeam) continue;

    const isWinner = winners.includes(member.id);
    if (medal === "Gold" && !isWinner) continue;
    if (medal === "Silver" && isWinner) continue;
    if (medal === "Bronze" && !isWinner) continue;

    const myScore = isWinner
      ? (match.winner_team === 1 ? match.team1_score : match.team2_score)
      : (match.winner_team === 1 ? match.team2_score : match.team1_score);
    const oppScore = isWinner
      ? (match.winner_team === 1 ? match.team2_score : match.team1_score)
      : (match.winner_team === 1 ? match.team1_score : match.team2_score);

    score = myScore !== null && oppScore !== null ? `${myScore} – ${oppScore}` : "";
    pointsEarned = myScore ?? 0;

    if (isDoubles && myTeam.length > 1) {
      players = myTeam.map((pid) => memberMap[pid]?.full_name ?? "Unknown");
    }
    break;
  }

  return {
    medal,
    players,
    eventName: event.name,
    eventPlayType: PLAY_TYPE_LABELS[event.play_type] ?? event.play_type,
    eventDate: new Date(event.date_time).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }),
    eventLocation: event.location,
    tournamentName,
    score,
    pointsEarned,
    club,
  };
}

function CertificatePrint({ cert }: { cert: CertData }) {
  const theme = MEDAL_THEME[cert.medal];

  return (
    <div
      id={`cert-${cert.medal}-${cert.players.join("-").replace(/\s/g, "")}`}
      style={{
        width: "210mm",
        minHeight: "148mm",
        backgroundColor: theme.printBg,
        border: `3px solid ${theme.printBorder}`,
        borderRadius: "12px",
        padding: "32px 40px",
        fontFamily: "Georgia, serif",
        position: "relative",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Corner decoration */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        border: `8px solid transparent`,
        borderImage: `linear-gradient(135deg, ${theme.printBorder}44 0%, transparent 50%, ${theme.printBorder}44 100%) 1`,
        borderRadius: "12px",
        pointerEvents: "none",
      }} />

      {/* Header: logo + club name */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "16px" }}>
        {cert.club.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cert.club.logo_url} alt="logo" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
        )}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: theme.printHeader, letterSpacing: "1px", textTransform: "uppercase" }}>
            {cert.club.name}
          </div>
          {cert.club.location && (
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>{cert.club.location}</div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "2px", background: `linear-gradient(to right, transparent, ${theme.printBorder}, transparent)`, margin: "0 0 18px" }} />

      {/* Certificate title */}
      <div style={{ textAlign: "center", marginBottom: "14px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", textTransform: "uppercase", color: theme.printAccent, marginBottom: "4px" }}>
          Certificate of Achievement
        </div>
        <div style={{ fontSize: "36px", fontWeight: "bold", color: theme.printBorder, lineHeight: 1 }}>
          {theme.icon} {theme.label} Medal
        </div>
      </div>

      {/* This is to certify */}
      <div style={{ textAlign: "center", fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}>
        This is to certify that
      </div>

      {/* Player name(s) */}
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        {cert.players.map((p, i) => (
          <div key={i} style={{ fontSize: "26px", fontWeight: "bold", color: theme.printHeader, borderBottom: `2px solid ${theme.printBorder}66`, display: "inline-block", padding: "0 32px 4px", marginBottom: i < cert.players.length - 1 ? "6px" : 0 }}>
            {p}
          </div>
        ))}
      </div>

      {/* Achievement text */}
      <div style={{ textAlign: "center", fontSize: "12px", color: "#6b7280", marginBottom: "14px", lineHeight: 1.6 }}>
        has achieved <strong style={{ color: theme.printAccent }}>{theme.label} Place</strong> in the<br />
        <strong style={{ color: theme.printHeader, fontSize: "14px" }}>{cert.eventName}</strong> — {cert.eventPlayType}<br />
        <span style={{ fontSize: "11px" }}>held at {cert.eventLocation} on {cert.eventDate}</span><br />
        <span style={{ fontSize: "11px" }}>as part of <em>{cert.tournamentName}</em></span>
        {cert.score && (
          <><br /><span style={{ fontSize: "11px", color: theme.printAccent }}>Final Score: {cert.score} · Points Earned: {cert.pointsEarned}</span></>
        )}
      </div>

      {/* Bottom divider */}
      <div style={{ height: "1px", background: `linear-gradient(to right, transparent, ${theme.printBorder}66, transparent)`, margin: "0 0 16px" }} />

      {/* Signature */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ textAlign: "center", minWidth: "180px" }}>
          <div style={{ height: "36px", borderBottom: `1px solid ${theme.printAccent}88`, marginBottom: "4px" }} />
          <div style={{ fontSize: "12px", fontWeight: "bold", color: theme.printHeader }}>
            {cert.club.president ?? "Club President"}
          </div>
          <div style={{ fontSize: "10px", color: "#9ca3af", letterSpacing: "1px", textTransform: "uppercase" }}>Club President</div>
        </div>
      </div>
    </div>
  );
}

function printCertificate(cert: CertData) {
  const theme = MEDAL_THEME[cert.medal];
  const playerNames = cert.players.map((p) =>
    `<div style="font-size:26px;font-weight:bold;color:${theme.printHeader};border-bottom:2px solid ${theme.printBorder}66;display:inline-block;padding:0 32px 4px;margin-bottom:6px">${p}</div>`
  ).join("<br/>");

  const logoHtml = cert.club.logo_url
    ? `<img src="${cert.club.logo_url}" alt="logo" style="width:56px;height:56px;border-radius:8px;object-fit:cover;" />`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${cert.medal} Certificate — ${cert.players.join(" & ")}</title>
  <style>
    @page { size: A5 landscape; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: white; }
    .cert {
      width: 210mm; min-height: 148mm; background: ${theme.printBg};
      border: 3px solid ${theme.printBorder}; border-radius: 12px;
      padding: 32px 40px; font-family: Georgia, serif; position: relative;
    }
    .corner-border {
      position: absolute; top: 6px; left: 6px; right: 6px; bottom: 6px;
      border: 2px solid ${theme.printBorder}33; border-radius: 8px; pointer-events: none;
    }
    .divider { height: 2px; background: linear-gradient(to right, transparent, ${theme.printBorder}, transparent); margin: 0 0 18px; }
    .divider-light { height: 1px; background: linear-gradient(to right, transparent, ${theme.printBorder}66, transparent); margin: 0 0 16px; }
  </style>
</head>
<body>
<div class="cert">
  <div class="corner-border"></div>
  <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px">
    ${logoHtml}
    <div style="text-align:center">
      <div style="font-size:18px;font-weight:bold;color:${theme.printHeader};letter-spacing:1px;text-transform:uppercase">${cert.club.name}</div>
      ${cert.club.location ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${cert.club.location}</div>` : ""}
    </div>
  </div>
  <div class="divider"></div>
  <div style="text-align:center;margin-bottom:14px">
    <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:${theme.printAccent};margin-bottom:4px">Certificate of Achievement</div>
    <div style="font-size:36px;font-weight:bold;color:${theme.printBorder};line-height:1">${theme.icon} ${theme.label} Medal</div>
  </div>
  <div style="text-align:center;font-size:12px;color:#6b7280;margin-bottom:10px">This is to certify that</div>
  <div style="text-align:center;margin-bottom:12px">${playerNames}</div>
  <div style="text-align:center;font-size:12px;color:#6b7280;margin-bottom:14px;line-height:1.6">
    has achieved <strong style="color:${theme.printAccent}">${theme.label} Place</strong> in the<br/>
    <strong style="color:${theme.printHeader};font-size:14px">${cert.eventName}</strong> — ${cert.eventPlayType}<br/>
    <span style="font-size:11px">held at ${cert.eventLocation} on ${cert.eventDate}</span><br/>
    <span style="font-size:11px">as part of <em>${cert.tournamentName}</em></span>
    ${cert.score ? `<br/><span style="font-size:11px;color:${theme.printAccent}">Final Score: ${cert.score} · Points Earned: ${cert.pointsEarned}</span>` : ""}
  </div>
  <div class="divider-light"></div>
  <div style="display:flex;justify-content:center">
    <div style="text-align:center;min-width:180px">
      <div style="height:36px;border-bottom:1px solid ${theme.printAccent}88;margin-bottom:4px"></div>
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
            {/* Tournament row */}
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

            {/* Events */}
            {isOpen && (
              <div className="border-t border-white/6">
                {(t.tournament_events ?? []).length === 0 && (
                  <p className="px-5 py-4 text-sm text-white/30">No events in this tournament</p>
                )}
                {(t.tournament_events ?? []).map((ev) => {
                  const titles = ev.titles ?? [];
                  const gold   = titles.find((ti) => ti.title_name === "Gold");
                  const silver = titles.find((ti) => ti.title_name === "Silver");
                  const bronze = titles.find((ti) => ti.title_name === "Bronze");
                  const hasMedals = gold || silver || bronze;
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
                            {gold   && <span>🥇</span>}
                            {silver && <span>🥈</span>}
                            {bronze && <span>🥉</span>}
                          </div>
                        )}
                        {hasMedals && (evOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-white/25" /> : <ChevronRight className="h-4 w-4 shrink-0 text-white/15" />)}
                      </button>

                      {/* Medal winners + print */}
                      {evOpen && hasMedals && (
                        <div className="space-y-2 bg-white/[0.015] px-5 pb-4 pt-2 pl-9">
                          {([["Gold", gold], ["Silver", silver], ["Bronze", bronze]] as [MedalType, TitleEntry | undefined][])
                            .filter(([, ti]) => !!ti)
                            .map(([medal, ti]) => {
                              const theme = MEDAL_THEME[medal];
                              const cert = buildCertData(ti!, ev, t.name, memberMap, club);
                              if (!cert) return null;

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
