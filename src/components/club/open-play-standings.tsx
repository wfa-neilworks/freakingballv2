"use client";

import { motion, AnimatePresence } from "framer-motion";

/* ─── Types ──────────────────────────────────────────────────── */
export interface StandingsRow {
  id: string;
  wins: number;
  losses: number;
  diff: number;
}

export interface StandingsMember {
  id: string;
  full_name: string;
  nickname: string | null;
  is_guest?: boolean;
  photo_url?: string | null;
}

interface OpenPlayStandingsProps {
  rows: StandingsRow[];
  memberMap: Map<string, StandingsMember>;
}

/* ─── Ease ───────────────────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* ─── SVG Crown (gold metallic, no emoji) ───────────────────── */
function CrownIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * 0.78}
      viewBox="0 0 40 31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="crown-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="45%" stopColor="#F5C842" />
          <stop offset="100%" stopColor="#C8882A" />
        </linearGradient>
        <linearGradient id="crown-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF9C4" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#FFE566" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gem-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="100%" stopColor="#F5A623" />
        </linearGradient>
        <filter id="crown-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Crown base band */}
      <rect x="3" y="19" width="34" height="9" rx="2" fill="url(#crown-body)" />
      {/* Base band highlight */}
      <rect x="3" y="19" width="34" height="3" rx="1.5" fill="url(#crown-shine)" opacity="0.6" />
      {/* Base band bottom edge */}
      <rect x="3" y="25.5" width="34" height="2.5" rx="1" fill="#A06820" opacity="0.35" />

      {/* Crown points (main body) */}
      <path
        d="M3 22 L3 10 L10 17 L20 3 L30 17 L37 10 L37 22 Z"
        fill="url(#crown-body)"
        filter="url(#crown-glow)"
      />
      {/* Crown points highlight overlay */}
      <path
        d="M3 22 L3 10 L10 17 L20 3 L30 17 L37 10 L37 22 Z"
        fill="url(#crown-shine)"
        opacity="0.45"
      />
      {/* Crown points inner shadow */}
      <path
        d="M3 22 L3 10 L10 17 L20 3 L30 17 L37 10 L37 22 Z"
        fill="none"
        stroke="#A06820"
        strokeWidth="0.75"
        opacity="0.5"
      />

      {/* Center gem */}
      <circle cx="20" cy="13.5" r="3" fill="url(#gem-gold)" />
      <circle cx="20" cy="13.5" r="3" fill="none" stroke="#C8882A" strokeWidth="0.75" />
      <circle cx="18.8" cy="12.4" r="1" fill="#FFF9C4" opacity="0.6" />

      {/* Left gem */}
      <circle cx="8.5" cy="20" r="2" fill="url(#gem-gold)" />
      <circle cx="8.5" cy="20" r="2" fill="none" stroke="#C8882A" strokeWidth="0.6" />
      <circle cx="7.7" cy="19.3" r="0.7" fill="#FFF9C4" opacity="0.55" />

      {/* Right gem */}
      <circle cx="31.5" cy="20" r="2" fill="url(#gem-gold)" />
      <circle cx="31.5" cy="20" r="2" fill="none" stroke="#C8882A" strokeWidth="0.6" />
      <circle cx="30.7" cy="19.3" r="0.7" fill="#FFF9C4" opacity="0.55" />
    </svg>
  );
}

/* ─── Avatar ─────────────────────────────────────────────────── */
function PodiumAvatar({
  member,
  size,
  ring,
  bg,
  textColor,
}: {
  member: StandingsMember | undefined;
  size: number;
  ring: string;
  bg: string;
  textColor: string;
}) {
  const name = member?.full_name ?? "?";
  const initials = name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const s = `${size}px`;

  if (member?.photo_url) {
    return (
      <div
        className="shrink-0 overflow-hidden rounded-full"
        style={{ width: s, height: s, border: `2px solid ${ring}`, boxShadow: `0 0 0 3px ${ring}22` }}
      >
        <img src={member.photo_url} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full font-black"
      style={{
        width: s,
        height: s,
        background: bg,
        border: `2px solid ${ring}`,
        boxShadow: `0 0 0 3px ${ring}22`,
        color: textColor,
        fontSize: size >= 64 ? "1.25rem" : "0.875rem",
      }}
    >
      {initials}
    </div>
  );
}

/* ─── Rank medal badge ───────────────────────────────────────── */
function RankBadge({ rank, large }: { rank: 1 | 2 | 3; large?: boolean }) {
  const cfg = {
    1: { label: "1st", bg: "rgba(234,179,8,0.18)", color: "#FACC15", border: "rgba(234,179,8,0.35)" },
    2: { label: "2nd", bg: "rgba(148,163,184,0.15)", color: "#94A3B8", border: "rgba(148,163,184,0.3)" },
    3: { label: "3rd", bg: "rgba(180,120,60,0.18)", color: "#CD7F32", border: "rgba(180,120,60,0.35)" },
  }[rank];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-bold tracking-wide uppercase ${large ? "px-3 py-1 text-[11px]" : "px-2.5 py-0.5 text-[10px]"}`}
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

/* ─── Podium column ──────────────────────────────────────────── */
const PODIUM = [
  {
    rank: 2 as const,
    height: "h-16",
    ring: "#94A3B8",
    bg: "rgba(148,163,184,0.14)",
    textColor: "#94A3B8",
    nameColor: "text-white/70",
    avatarSize: 52,
    delay: 0.15,
  },
  {
    rank: 1 as const,
    height: "h-24",
    ring: "#FACC15",
    bg: "rgba(234,179,8,0.18)",
    textColor: "#FACC15",
    nameColor: "text-white",
    avatarSize: 68,
    delay: 0.05,
  },
  {
    rank: 3 as const,
    height: "h-10",
    ring: "#CD7F32",
    bg: "rgba(180,120,60,0.18)",
    textColor: "#CD7F32",
    nameColor: "text-white/60",
    avatarSize: 48,
    delay: 0.22,
  },
];

function PodiumColumn({
  row,
  member,
  cfg,
}: {
  row: StandingsRow | undefined;
  member: StandingsMember | undefined;
  cfg: (typeof PODIUM)[number];
}) {
  if (!row) {
    return (
      <div className="flex flex-col items-center" style={{ minWidth: cfg.rank === 1 ? 96 : 80 }}>
        {/* spacer for crown */}
        {cfg.rank === 1 && <div className="mb-2 h-7" />}
        <div
          className="shrink-0 rounded-full border-2 border-dashed border-white/10"
          style={{ width: cfg.avatarSize, height: cfg.avatarSize }}
        />
        <div className={`mt-3 rounded-full bg-white/5 ${cfg.height} w-full`} />
      </div>
    );
  }

  const fullName = member?.full_name ?? row.id.slice(0, 8);
  const nickname = member?.nickname ?? null;

  return (
    <motion.div
      className="flex flex-col items-center"
      style={{ minWidth: cfg.rank === 1 ? 96 : 80 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: cfg.delay, ease }}
    >
      {/* Crown (1st only) */}
      {cfg.rank === 1 && (
        <motion.div
          className="mb-2 flex items-center justify-center"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease }}
          style={{ filter: "drop-shadow(0 0 8px rgba(234,179,8,0.5))" }}
        >
          <CrownIcon size={32} />
        </motion.div>
      )}
      {/* spacer so 2nd/3rd align to same avatar baseline */}
      {cfg.rank !== 1 && <div className="mb-2 h-7" />}

      {/* Avatar */}
      <PodiumAvatar
        member={member}
        size={cfg.avatarSize}
        ring={cfg.ring}
        bg={cfg.bg}
        textColor={cfg.textColor}
      />

      {/* Name */}
      <div className="mt-2.5 text-center" style={{ maxWidth: cfg.rank === 1 ? 100 : 84 }}>
        <p
          className={`font-bold leading-tight ${cfg.nameColor} ${cfg.rank === 1 ? "text-sm" : "text-xs"}`}
          style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
        >
          {fullName}
        </p>
        {nickname && (
          <p className="mt-0.5 truncate text-[10px] text-white/30">&ldquo;{nickname}&rdquo;</p>
        )}
        {member?.is_guest && (
          <span className="mt-0.5 inline-block rounded px-1.5 text-[9px] font-semibold text-yellow-400/70"
            style={{ background: "rgba(234,179,8,0.1)" }}>Guest</span>
        )}
      </div>

      {/* Stats */}
      <p className="mt-1.5 text-[10px] text-white/40">
        <span style={{ color: "#b7ff72", fontWeight: 700 }}>{row.wins}W</span>
        <span className="mx-1 text-white/20">·</span>
        <span>{row.losses}L</span>
        <span className="mx-1 text-white/20">·</span>
        <span style={{ color: row.diff >= 0 ? "#b7ff72" : "#f87171", fontWeight: 700 }}>
          {row.diff >= 0 ? "+" : ""}{row.diff}
        </span>
      </p>

      {/* Podium plinth */}
      <div className="mt-3 w-full">
        <div
          className={`w-full rounded-t-lg ${cfg.height} flex items-center justify-center`}
          style={{
            background: cfg.rank === 1
              ? "linear-gradient(180deg, rgba(234,179,8,0.22) 0%, rgba(234,179,8,0.08) 100%)"
              : cfg.rank === 2
              ? "linear-gradient(180deg, rgba(148,163,184,0.16) 0%, rgba(148,163,184,0.06) 100%)"
              : "linear-gradient(180deg, rgba(180,120,60,0.18) 0%, rgba(180,120,60,0.06) 100%)",
            borderTop: `1px solid ${cfg.ring}40`,
            borderLeft: `1px solid ${cfg.ring}20`,
            borderRight: `1px solid ${cfg.ring}20`,
          }}
        >
          <RankBadge rank={cfg.rank} large={cfg.rank === 1} />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Table row rank icon ────────────────────────────────────── */
function RankCell({ rank }: { rank: number }) {
  if (rank <= 3) {
    const colors = {
      4: "", // won't hit here
      1: "text-yellow-400",
      2: "text-slate-400",
      3: "text-amber-600",
    } as Record<number, string>;
    return (
      <span className={`text-xs font-black tabular-nums ${colors[rank]}`}>{rank}</span>
    );
  }
  return <span className="text-xs text-white/25 tabular-nums">{rank}</span>;
}

/* ─── Full standings table (all ranks) ──────────────────────── */
function StandingsTable({
  rows,
  memberMap,
  startRank = 4,
}: {
  rows: StandingsRow[];
  memberMap: Map<string, StandingsMember>;
  startRank?: number;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08]" style={{ background: "rgba(255,255,255,0.025)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.07]">
            <th className="w-10 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/25">#</th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-white/25">Player</th>
            <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-white/25">W</th>
            <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-white/25">L</th>
            <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-white/25">+/−</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const mem = memberMap.get(row.id);
            const rank = startRank + i;
            const isTop3 = rank <= 3;
            return (
              <motion.tr
                key={row.id}
                className="group border-b border-white/[0.04] last:border-0 transition-colors duration-150"
                style={{ cursor: "default" }}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.04, ease }}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <td className="px-4 py-3">
                  <RankCell rank={rank} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    {/* Mini avatar */}
                    <TableAvatar member={mem} rank={isTop3 ? rank as 1|2|3 : undefined} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight text-white/90">
                        {mem?.full_name ?? row.id.slice(0, 8)}
                      </p>
                      {mem?.nickname && (
                        <p className="truncate text-[10px] text-white/30">&ldquo;{mem.nickname}&rdquo;</p>
                      )}
                    </div>
                    {mem?.is_guest && (
                      <span className="ml-1 shrink-0 rounded px-1.5 text-[9px] font-semibold text-yellow-400/70"
                        style={{ background: "rgba(234,179,8,0.1)" }}>G</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-sm font-bold" style={{ color: "#b7ff72" }}>{row.wins}</span>
                </td>
                <td className="px-3 py-3 text-center text-sm text-white/45">{row.losses}</td>
                <td className="px-3 py-3 text-center">
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: row.diff >= 0 ? "#b7ff72" : "#f87171" }}
                  >
                    {row.diff >= 0 ? "+" : ""}{row.diff}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Mini avatar for table rows ────────────────────────────── */
function TableAvatar({ member, rank }: { member: StandingsMember | undefined; rank?: 1|2|3 }) {
  const name = member?.full_name ?? "?";
  const initials = name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  const ringColor = rank === 1 ? "#FACC15" : rank === 2 ? "#94A3B8" : rank === 3 ? "#CD7F32" : undefined;
  const bgColor = rank === 1 ? "rgba(234,179,8,0.15)" : rank === 2 ? "rgba(148,163,184,0.12)" : rank === 3 ? "rgba(180,120,60,0.15)" : "rgba(255,255,255,0.06)";
  const textColor = rank === 1 ? "#FACC15" : rank === 2 ? "#94A3B8" : rank === 3 ? "#CD7F32" : "rgba(255,255,255,0.4)";

  if (member?.photo_url) {
    return (
      <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full"
        style={{ border: ringColor ? `1.5px solid ${ringColor}` : "1.5px solid rgba(255,255,255,0.1)" }}>
        <img src={member.photo_url} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
      style={{
        background: bgColor,
        border: ringColor ? `1.5px solid ${ringColor}` : "1.5px solid rgba(255,255,255,0.08)",
        color: textColor,
      }}
    >
      {initials}
    </div>
  );
}

/* ─── Main exported component ────────────────────────────────── */
export function OpenPlayStandings({ rows, memberMap }: OpenPlayStandingsProps) {
  if (rows.length === 0) return null;

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  // Podium visual order: 2nd (left), 1st (center), 3rd (right)
  const podiumSlots = [
    { row: top3[1], cfg: PODIUM[0] },
    { row: top3[0], cfg: PODIUM[1] },
    { row: top3[2], cfg: PODIUM[2] },
  ];

  return (
    <div className="space-y-5">
      {/* ── Podium ─────────────────────────────────────────── */}
      <div
        className="overflow-hidden rounded-2xl border border-white/[0.07] px-4 pb-0 pt-6"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        {/* Section label */}
        <p className="mb-5 text-center text-[10px] font-semibold uppercase tracking-widest text-white/25">
          Standings
        </p>

        {/* Three columns */}
        <div className="flex items-end justify-center gap-4 sm:gap-6">
          {podiumSlots.map(({ row, cfg }) => (
            <PodiumColumn
              key={cfg.rank}
              row={row}
              member={row ? memberMap.get(row.id) : undefined}
              cfg={cfg}
            />
          ))}
        </div>
      </div>

      {/* ── Rest of table (4th and below) ─────────────────── */}
      {rest.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3, ease }}
        >
          <StandingsTable rows={rest} memberMap={memberMap} startRank={4} />
        </motion.div>
      )}

      {/* ── If there are only 1–3 players, show them in table too ── */}
      {rest.length === 0 && top3.length > 0 && rows.length <= 6 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3, ease }}
        >
          <StandingsTable rows={rows} memberMap={memberMap} startRank={1} />
        </motion.div>
      )}
    </div>
  );
}
