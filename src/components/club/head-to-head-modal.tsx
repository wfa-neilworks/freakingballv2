"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppModal, ModalHeader, ModalBody } from "@/components/ui/app-modal";
import {
  Search,
  X,
  Swords,
  ChevronDown,
  Trophy,
  Minus,
} from "lucide-react";
import type { PlayerRow } from "@/components/club/stats-leaderboard";

/* ─── Types ──────────────────────────────────────────────────── */
export interface H2HMember {
  id: string;
  full_name: string;
  nickname: string | null;
  photo_url?: string | null;
}

/* ─── Constants ─────────────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const PAGE_SIZE = 15;

const PLAY_TYPE_LABELS: Record<string, string> = {
  singles:       "Singles",
  doubles:       "Doubles",
  mixed_doubles: "Mixed Doubles",
  open_doubles:  "Open Doubles",
};

/* ─── Mini avatar ───────────────────────────────────────────── */
function MiniAvatar({
  name,
  photoUrl,
  size = 48,
  accent = "#b7ff72",
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  accent?: string;
}) {
  const initials = name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  if (photoUrl) {
    return (
      <div
        className="shrink-0 overflow-hidden rounded-full"
        style={{ width: size, height: size, border: `2px solid ${accent}`, boxShadow: `0 0 0 2px ${accent}22` }}
      >
        <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-black"
      style={{
        width: size,
        height: size,
        background: `${accent}18`,
        color: accent,
        fontSize: size * 0.33,
        border: `2px solid ${accent}`,
        boxShadow: `0 0 0 2px ${accent}22`,
      }}
    >
      {initials}
    </div>
  );
}

/* ─── Head-to-head match row ────────────────────────────────── */
function H2HMatchRow({
  match,
  playerName,
  index,
}: {
  match: PlayerRow["matches"][number];
  playerName: string;
  index: number;
}) {
  const date = match.date
    ? new Date(match.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const isOpenPlay = match.source === "open_play";

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, delay: index * 0.025, ease }}
      className="flex items-center gap-3 border-b border-white/[0.04] px-4 py-3 last:border-0 hover:bg-white/[0.02]"
    >
      {/* Win/loss dot */}
      <div
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: match.won ? "#b7ff72" : "rgba(248,113,113,0.7)" }}
      />

      {/* Meta */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-white/35">
          <span
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
            style={
              isOpenPlay
                ? { background: "rgba(96,165,250,0.12)", color: "#60a5fa" }
                : { background: "rgba(183,255,114,0.08)", color: "rgba(183,255,114,0.6)" }
            }
          >
            {isOpenPlay ? "Open Play" : "Tournament"}
          </span>
          <span>{PLAY_TYPE_LABELS[match.play_type] ?? match.play_type}</span>
          {match.is_playoff && (
            <>
              <span className="text-white/15">·</span>
              <span style={{ color: "#b7ff72" }} className="opacity-70">Playoff</span>
            </>
          )}
          {match.event_name && (
            <>
              <span className="text-white/15">·</span>
              <span className="truncate">{match.event_name}</span>
            </>
          )}
          {date && (
            <>
              <span className="text-white/15">·</span>
              <span>{date}</span>
            </>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="shrink-0 text-right">
        <p
          className="text-sm font-bold tabular-nums"
          style={{ color: match.won ? "#b7ff72" : "rgba(255,255,255,0.5)" }}
        >
          {match.my_score} – {match.opp_score}
        </p>
        <p
          className="text-[10px] font-semibold uppercase"
          style={{ color: match.won ? "rgba(183,255,114,0.6)" : "rgba(248,113,113,0.6)" }}
        >
          {match.won ? "Win" : "Loss"}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Stat pill ─────────────────────────────────────────────── */
function StatPill({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  accent: string;
  sub?: string;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-3 py-3"
      style={{ background: `${accent}0d` }}
    >
      <p className="text-xl font-black tabular-nums leading-none" style={{ color: accent }}>{value}</p>
      <p className="text-[10px] text-white/35 text-center">{label}</p>
      {sub && <p className="text-[9px] text-white/20 text-center">{sub}</p>}
    </div>
  );
}

/* ─── Opponent picker item ──────────────────────────────────── */
function MemberPickerItem({
  member,
  onSelect,
}: {
  member: H2HMember;
  onSelect: (m: H2HMember) => void;
}) {
  return (
    <button
      onClick={() => onSelect(member)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.05]"
    >
      <MiniAvatar name={member.full_name} photoUrl={member.photo_url} size={36} accent="#60a5fa" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white/85">{member.full_name}</p>
        {member.nickname && (
          <p className="truncate text-[11px] text-white/30">&ldquo;{member.nickname}&rdquo;</p>
        )}
      </div>
    </button>
  );
}

/* ─── Main modal ────────────────────────────────────────────── */
interface HeadToHeadModalProps {
  open: boolean;
  onClose: () => void;
  player: PlayerRow;
  allMembers: H2HMember[];
}

export function HeadToHeadModal({ open, onClose, player, allMembers }: HeadToHeadModalProps) {
  const [opponent, setOpponent] = useState<H2HMember | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [matchPage, setMatchPage] = useState(1);

  function handleClose() {
    onClose();
    setTimeout(() => {
      setOpponent(null);
      setPickerSearch("");
      setMatchPage(1);
    }, 300);
  }

  /* Picker: filter members (exclude the player themselves) */
  const pickerMembers = useMemo(() => {
    const q = pickerSearch.toLowerCase();
    return allMembers.filter(
      (m) =>
        m.id !== player.id &&
        (m.full_name.toLowerCase().includes(q) ||
          (m.nickname ?? "").toLowerCase().includes(q))
    );
  }, [allMembers, player.id, pickerSearch]);

  /* H2H: find all of player's matches where opponent appears as an opponent */
  const h2hMatches = useMemo(() => {
    if (!opponent) return [];
    return player.matches.filter((m) => {
      const oppId = opponent.id;
      // opponent1/opponent2 are full_name strings — we need to match by name
      // BUT: we stored names at build time. We must match by opponent name.
      // The allMembers list gives us the name. Use full_name for matching.
      const opp1 = m.opponent1;
      const opp2 = m.opponent2 ?? "";
      return (
        opp1 === opponent.full_name ||
        opp2 === opponent.full_name
      );
    });
  }, [player.matches, opponent]);

  /* Aggregate H2H stats */
  const h2hStats = useMemo(() => {
    let wins = 0, losses = 0;
    let pointsFor = 0, pointsAgainst = 0;
    for (const m of h2hMatches) {
      if (m.won) wins++; else losses++;
      pointsFor     += m.my_score;
      pointsAgainst += m.opp_score;
    }
    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    return { wins, losses, total, winRate, pointsFor, pointsAgainst };
  }, [h2hMatches]);

  const pagedMatches = h2hMatches.slice(0, matchPage * PAGE_SIZE);
  const hasMore = pagedMatches.length < h2hMatches.length;

  /* Who's winning overall */
  const dominance =
    h2hStats.wins > h2hStats.losses ? "player" :
    h2hStats.losses > h2hStats.wins ? "opponent" :
    "even";

  return (
    <AppModal open={open} onClose={handleClose} maxWidth="max-w-2xl">
      <ModalHeader
        icon={<Swords className="h-[18px] w-[18px] text-brand-lime" />}
        title="Head to Head"
        subtitle={opponent ? `${player.full_name} vs ${opponent.full_name}` : "Select an opponent to compare"}
        onClose={handleClose}
      />

      <ModalBody className="p-0">

        {/* ── VS header ──────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 border-b px-5 py-4"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
        >
          {/* Player A */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <MiniAvatar name={player.full_name} photoUrl={player.photo_url} size={52} accent="#b7ff72" />
            <p className="max-w-[100px] truncate text-center text-[13px] font-black text-white">{player.full_name}</p>
            {opponent && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                style={
                  dominance === "player"
                    ? { background: "rgba(183,255,114,0.12)", color: "#b7ff72" }
                    : dominance === "even"
                    ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }
                    : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)" }
                }
              >
                {h2hStats.wins}W
              </span>
            )}
          </div>

          {/* VS divider */}
          <div className="flex shrink-0 flex-col items-center gap-1">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}
            >
              VS
            </div>
          </div>

          {/* Player B — picker or selected */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            {opponent ? (
              <>
                <MiniAvatar name={opponent.full_name} photoUrl={opponent.photo_url} size={52} accent="#60a5fa" />
                <div className="flex items-center gap-1">
                  <p className="max-w-[90px] truncate text-center text-[13px] font-black text-white">{opponent.full_name}</p>
                  <button
                    onClick={() => { setOpponent(null); setMatchPage(1); }}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-white/20 hover:bg-white/10 hover:text-white/50"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  style={
                    dominance === "opponent"
                      ? { background: "rgba(96,165,250,0.15)", color: "#60a5fa" }
                      : dominance === "even"
                      ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }
                      : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)" }
                  }
                >
                  {h2hStats.losses}W
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-dashed"
                  style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)" }}
                >
                  <Search className="h-4 w-4 text-white/20" />
                </div>
                <p className="text-[12px] text-white/30">Select opponent</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Opponent picker (when no opponent selected) ────── */}
        <AnimatePresence mode="wait">
          {!opponent ? (
            <motion.div
              key="picker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Search */}
              <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div
                  className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] px-3.5 transition-all focus-within:border-brand-lime/40 focus-within:shadow-[0_0_0_3px_rgba(183,255,114,0.06)]"
                  style={{ height: "38px", background: "rgba(255,255,255,0.03)" }}
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-white/20" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search members…"
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
                    autoFocus
                  />
                  <AnimatePresence>
                    {pickerSearch && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.1 }}
                        onClick={() => setPickerSearch("")}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-white/30 hover:bg-white/10"
                      >
                        <X className="h-3 w-3" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Member list */}
              <div className="max-h-[340px] divide-y divide-white/[0.04] overflow-y-auto">
                {pickerMembers.length === 0 ? (
                  <p className="py-10 text-center text-sm text-white/25">No members found</p>
                ) : (
                  pickerMembers.map((m) => (
                    <MemberPickerItem
                      key={m.id}
                      member={m}
                      onSelect={(selected) => { setOpponent(selected); setPickerSearch(""); setMatchPage(1); }}
                    />
                  ))
                )}
              </div>
            </motion.div>

          ) : (
            /* ── H2H results ──────────────────────────────────── */
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {h2hMatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div
                    className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07]"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <Swords className="h-5 w-5 text-white/15" />
                  </div>
                  <p className="font-semibold text-white/30">No shared matches</p>
                  <p className="mt-1 text-sm text-white/18">
                    {player.full_name} and {opponent.full_name} haven&apos;t faced each other yet.
                  </p>
                </div>
              ) : (
                <>
                  {/* ── Summary stats ─────────────────────────── */}
                  <div className="border-b px-4 py-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>

                    {/* Dominance bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5 text-[11px] text-white/30">
                        <span>{h2hStats.wins} wins</span>
                        <span className="text-white/20">{h2hStats.total} matches</span>
                        <span>{h2hStats.losses} wins</span>
                      </div>
                      <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        {h2hStats.total > 0 && (
                          <>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(h2hStats.wins / h2hStats.total) * 100}%` }}
                              transition={{ duration: 0.8, ease }}
                              className="h-full rounded-l-full"
                              style={{ background: "#b7ff72" }}
                            />
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(h2hStats.losses / h2hStats.total) * 100}%` }}
                              transition={{ duration: 0.8, ease }}
                              className="h-full rounded-r-full"
                              style={{ background: "#60a5fa" }}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stat pills row */}
                    <div className="flex gap-2">
                      <StatPill
                        label="Win Rate"
                        value={`${h2hStats.winRate}%`}
                        accent={h2hStats.winRate >= 50 ? "#b7ff72" : "#f87171"}
                      />
                      <StatPill
                        label="Pts For"
                        value={h2hStats.pointsFor}
                        accent="#60a5fa"
                      />
                      <StatPill
                        label="Pts Against"
                        value={h2hStats.pointsAgainst}
                        accent="#f87171"
                      />
                      <StatPill
                        label="Pt Diff"
                        value={h2hStats.pointsFor - h2hStats.pointsAgainst >= 0
                          ? `+${h2hStats.pointsFor - h2hStats.pointsAgainst}`
                          : `${h2hStats.pointsFor - h2hStats.pointsAgainst}`}
                        accent={h2hStats.pointsFor >= h2hStats.pointsAgainst ? "#b7ff72" : "#f87171"}
                      />
                    </div>
                  </div>

                  {/* ── Match list ─────────────────────────────── */}
                  <div className="border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-3.5 w-3.5 text-white/20" />
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/25">Match History</p>
                      </div>
                      <span className="text-[11px] text-white/20">{h2hMatches.length} match{h2hMatches.length !== 1 ? "es" : ""}</span>
                    </div>
                  </div>

                  <div className="max-h-[320px] overflow-y-auto">
                    {pagedMatches.map((m, i) => (
                      <H2HMatchRow
                        key={m.id}
                        match={m}
                        playerName={player.full_name}
                        index={i}
                      />
                    ))}
                    {hasMore && (
                      <div className="border-t border-white/[0.04] p-3 text-center">
                        <button
                          onClick={() => setMatchPage((p) => p + 1)}
                          className="flex items-center gap-1.5 mx-auto rounded-xl px-4 py-2 text-sm font-medium text-white/35 hover:bg-white/5 hover:text-white/60"
                        >
                          <ChevronDown className="h-4 w-4" />
                          Load more ({h2hMatches.length - pagedMatches.length} remaining)
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </ModalBody>
    </AppModal>
  );
}
