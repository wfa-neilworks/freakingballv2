"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  generateSinglesRound,
  generateDoublesRound,
  createHistory,
  type Player,
} from "@/lib/rotation";
import { UserPlus, Play, StopCircle, ChevronDown, ChevronUp, X, Plus } from "lucide-react";
import { isValidPickleballScore } from "@/components/club/score-picker";
import { OpenPlayStandings } from "@/components/club/open-play-standings";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  full_name: string;
  nickname: string | null;
  gender: "male" | "female" | "other";
  is_guest: boolean;
  photo_url?: string | null;
}

interface Match {
  id: string;
  round_number: number;
  court_number: number;
  team1_player1: string;
  team1_player2: string | null;
  team2_player1: string;
  team2_player2: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_team: 1 | 2 | null;
}

type SlotKey = "team1_player1" | "team1_player2" | "team2_player1" | "team2_player2";

interface OpenPlayManagerProps {
  session: {
    id: string;
    play_type: string;
    partner_mode: string | null;
    doubles_category: string | null;
    num_courts: number;
    status: string;
  };
  allMembers: Member[];
  participantIds: string[];
  matches: Match[];
}

// ─── Pickleball SVG ─────────────────────────────────────────────────────────

function PickleballSVG({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" fill="#e8e830" stroke="#c9c920" strokeWidth="0.5" />
      {/* seam lines */}
      <path d="M4 10 Q14 14 24 10" stroke="#c0c018" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M4 18 Q14 14 24 18" stroke="#c0c018" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* holes */}
      {[
        [8, 9], [14, 8], [20, 9],
        [6, 14], [11, 13], [17, 13], [22, 14],
        [8, 19], [14, 20], [20, 19],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.4" fill="#c8c815" />
      ))}
      {/* shine */}
      <ellipse cx="10" cy="10" rx="3" ry="2" fill="white" opacity="0.2" transform="rotate(-20,10,10)" />
    </svg>
  );
}

// ─── Flying ball overlay ─────────────────────────────────────────────────────

interface BallFlight {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  onComplete: () => void;
}

function FlyingBall({ flight }: { flight: BallFlight }) {
  const prefersReduced = useReducedMotion();
  const { fromX, fromY, toX, toY, onComplete } = flight;

  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const arcHeight = prefersReduced ? 0 : Math.min(120, dist * 0.35);

  // Cubic bezier control points for a natural arc
  const cp1x = fromX + dx * 0.25;
  const cp1y = fromY - arcHeight;
  const cp2x = fromX + dx * 0.75;
  const cp2y = toY - arcHeight * 0.4;

  const duration = prefersReduced ? 0.15 : Math.min(0.65, 0.3 + dist * 0.0008);

  return (
    <motion.div
      className="pointer-events-none fixed z-[9999]"
      style={{ left: fromX - 14, top: fromY - 14 }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
      animate={{
        x: [0, cp1x - fromX, cp2x - fromX, dx],
        y: [0, cp1y - fromY, cp2y - fromY, dy],
        rotate: prefersReduced ? 0 : [0, 120, 240, 360],
        scale: [1, 1.1, 1.05, 0.85],
        opacity: [1, 1, 1, 0],
      }}
      transition={{
        duration,
        ease: "easeIn",
        times: [0, 0.3, 0.7, 1],
      }}
      onAnimationComplete={onComplete}
    >
      <PickleballSVG size={28} />
    </motion.div>
  );
}

// ─── Impact flash ─────────────────────────────────────────────────────────────

function ImpactFlash({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-lg"
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{ background: "radial-gradient(circle, rgba(183,255,114,0.5) 0%, transparent 70%)" }}
        />
      )}
    </AnimatePresence>
  );
}

// ─── Player selection popup ───────────────────────────────────────────────────

interface PlayerPickerPopupProps {
  players: { id: string; name: string; initials: string; isGuest: boolean }[];
  onSelect: (playerId: string, buttonRef: HTMLButtonElement) => void;
  onClose: () => void;
}

function PlayerPickerPopup({ players, onSelect, onClose }: PlayerPickerPopupProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Sheet */}
        <motion.div
          className="relative z-10 w-full max-w-sm overflow-hidden rounded-t-3xl border border-white/10 bg-[#0c1a10] shadow-2xl sm:rounded-2xl"
          initial={{ y: 60, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between px-5 pb-3 pt-4">
            <div>
              <div className="flex items-center gap-2">
                <PickleballSVG size={18} />
                <h2 className="text-base font-bold text-white">Choose a Player</h2>
              </div>
              <p className="mt-0.5 text-xs text-white/40">
                Select an available player to fill this position
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="mx-5 border-t border-white/[0.07]" />

          {/* Player list */}
          <div className="max-h-72 overflow-y-auto px-4 py-3">
            {players.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                  <PickleballSVG size={28} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white/50">No players available</p>
                  <p className="mt-1 text-xs text-white/25">All participants are currently on a court</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {players.map((p) => (
                  <motion.button
                    key={p.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={(e) => onSelect(p.id, e.currentTarget as HTMLButtonElement)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-brand-lime/30 hover:bg-brand-lime/[0.08]"
                  >
                    {/* Avatar */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-xs font-bold text-white/60 group-hover:bg-brand-lime/15 group-hover:text-brand-lime">
                      {p.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white/80 group-hover:text-white">
                        {p.name}
                      </span>
                      {p.isGuest && (
                        <span className="text-[10px] font-medium text-white/30">Guest</span>
                      )}
                    </div>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-transparent text-white/20 transition group-hover:border-brand-lime/40 group-hover:bg-brand-lime/15 group-hover:text-brand-lime">
                      <Plus className="h-3 w-3" />
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Safe area bottom padding */}
          <div className="h-safe-area-inset-bottom h-4" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function OpenPlayManager({
  session,
  allMembers,
  participantIds: initialParticipants,
  matches: initialMatches,
}: OpenPlayManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [participants, setParticipants] = useState<Set<string>>(new Set(initialParticipants));
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [scores, setScores] = useState<Record<string, { t1: string; t2: string }>>({});
  const [sessionStatus, setSessionStatus] = useState(session.status);
  const [participantsOpen, setParticipantsOpen] = useState(true);
  const [standingsOpen, setStandingsOpen] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Swap state: which slot is awaiting a player
  const [swapTarget, setSwapTarget] = useState<{ matchId: string; slot: SlotKey } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Ball flight animation
  const [ballFlight, setBallFlight] = useState<BallFlight | null>(null);
  const [impactSlot, setImpactSlot] = useState<string | null>(null); // "matchId::slot"
  const [fillingSlot, setFillingSlot] = useState<string | null>(null); // player being assigned (block re-clicks)

  // Refs: empty slot DOM elements keyed by "matchId::slot"
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const memberMap = new Map(allMembers.map((m) => [m.id, m]));
  const isSingles = session.play_type === "singles";
  const maxRound = Math.max(0, ...matches.map((m) => m.round_number));

  function playerName(id: string | null | undefined) {
    if (!id) return "—";
    const m = memberMap.get(id);
    return m?.nickname ?? m?.full_name ?? id.slice(0, 8);
  }

  function playerInitials(id: string) {
    const m = memberMap.get(id);
    const name = m?.nickname ?? m?.full_name ?? "?";
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  }

  function buildHistory(allMatches: Match[], players: Player[]) {
    const history = createHistory(players.map((p) => p.id));
    for (const m of allMatches) {
      history.matchCount.set(m.team1_player1, (history.matchCount.get(m.team1_player1) ?? 0) + 1);
      history.matchCount.set(m.team2_player1, (history.matchCount.get(m.team2_player1) ?? 0) + 1);
      if (m.team1_player2) {
        history.matchCount.set(m.team1_player2, (history.matchCount.get(m.team1_player2) ?? 0) + 1);
        history.partneredWith.get(m.team1_player1)?.add(m.team1_player2);
        history.partneredWith.get(m.team1_player2)?.add(m.team1_player1);
      }
      if (m.team2_player2) {
        history.matchCount.set(m.team2_player2, (history.matchCount.get(m.team2_player2) ?? 0) + 1);
        history.partneredWith.get(m.team2_player1)?.add(m.team2_player2);
        history.partneredWith.get(m.team2_player2)?.add(m.team2_player1);
      }
      [m.team1_player1, m.team1_player2].filter(Boolean).forEach((a) => {
        [m.team2_player1, m.team2_player2].filter(Boolean).forEach((b) => {
          if (a && b) {
            history.playedAgainst.get(a)?.add(b);
            history.playedAgainst.get(b)?.add(a);
          }
        });
      });
    }
    return history;
  }

  async function toggleParticipant(memberId: string) {
    const supabase = createClient();
    const next = new Set(participants);
    if (next.has(memberId)) {
      await supabase.from("open_play_participants").delete()
        .eq("open_play_id", session.id).eq("member_id", memberId);
      next.delete(memberId);
    } else {
      await supabase.from("open_play_participants").insert({
        open_play_id: session.id,
        member_id: memberId,
      });
      next.add(memberId);
    }
    setParticipants(next);
  }

  async function generateNextRound() {
    const players: Player[] = [...participants].map((id) => ({
      id,
      gender: memberMap.get(id)?.gender,
    }));
    const history = buildHistory(matches, players);
    const nextRound = maxRound + 1;
    const minNeeded = isSingles ? 2 : 4;
    const courtsToFill = Math.min(session.num_courts, Math.floor(players.length / minNeeded));
    let assignments;
    if (isSingles) {
      assignments = generateSinglesRound(players, courtsToFill, history);
    } else {
      assignments = generateDoublesRound(
        players, courtsToFill, history,
        (session.partner_mode ?? "rotating") as "fixed" | "rotating",
        session.play_type as "doubles" | "mixed_doubles" | "open_doubles"
      );
    }
    const supabase = createClient();
    const inserts = assignments.map((a) => ({
      open_play_id: session.id,
      court_number: a.courtNumber,
      round_number: nextRound,
      team1_player1: a.team1[0],
      team1_player2: a.team1[1] ?? null,
      team2_player1: a.team2[0],
      team2_player2: a.team2[1] ?? null,
    }));
    const { data: newMatches } = await supabase.from("open_play_matches").insert(inserts).select("*");
    if (newMatches) setMatches((prev) => [...prev, ...newMatches]);
    if (sessionStatus === "scheduled") {
      await supabase.from("open_plays").update({ status: "active" }).eq("id", session.id);
      setSessionStatus("active");
    }
  }

  async function fillFreeCourts(currentMatches: typeof matches, force = false) {
    const supabase = createClient();
    const allPlayers: Player[] = [...participants].map((id) => ({
      id,
      gender: memberMap.get(id)?.gender,
    }));
    const minNeeded = isSingles ? 2 : 4;
    const courtsInUse = Math.min(session.num_courts, Math.floor(allPlayers.length / minNeeded));
    const activeCourts = new Set(
      currentMatches.filter((m) => m.winner_team === null).map((m) => m.court_number)
    );
    const freeCourts = Array.from({ length: courtsInUse }, (_, i) => i + 1).filter(
      (c) => !activeCourts.has(c)
    );
    if (freeCourts.length === 0) return;
    const isExactFit = allPlayers.length === courtsInUse * minNeeded;
    if (!force && isExactFit && activeCourts.size > 0) return;

    const busyPlayers = new Set<string>();
    for (const m of currentMatches) {
      if (m.winner_team === null) {
        [m.team1_player1, m.team1_player2, m.team2_player1, m.team2_player2]
          .filter(Boolean)
          .forEach((id) => busyPlayers.add(id!));
      }
    }

    const newMatches: typeof matches = [];
    let nextRoundNum = Math.max(0, ...currentMatches.map((m) => m.round_number)) + 1;

    for (const courtNum of freeCourts) {
      const availablePlayers = allPlayers.filter((p) => !busyPlayers.has(p.id));
      if (availablePlayers.length < minNeeded) break;
      const history = buildHistory([...currentMatches, ...newMatches], allPlayers);
      let assignments;
      if (isSingles) {
        assignments = generateSinglesRound(availablePlayers, 1, history);
      } else {
        assignments = generateDoublesRound(
          availablePlayers, 1, history,
          (session.partner_mode ?? "rotating") as "fixed" | "rotating",
          session.play_type as "doubles" | "mixed_doubles" | "open_doubles"
        );
      }
      if (!assignments[0]) break;
      const a = assignments[0];
      const { data: newMatch } = await supabase.from("open_play_matches").insert({
        open_play_id: session.id,
        court_number: courtNum,
        round_number: nextRoundNum++,
        team1_player1: a.team1[0],
        team1_player2: a.team1[1] ?? null,
        team2_player1: a.team2[0],
        team2_player2: a.team2[1] ?? null,
      }).select("*").single();

      if (newMatch) {
        newMatches.push(newMatch);
        [a.team1[0], a.team1[1], a.team2[0], a.team2[1]]
          .filter(Boolean)
          .forEach((id) => busyPlayers.add(id!));
      }
    }

    if (newMatches.length > 0) setMatches((prev) => [...prev, ...newMatches]);
  }

  async function submitScore(matchId: string) {
    const s = scores[matchId];
    if (!s) return;
    const t1 = parseInt(s.t1, 10);
    const t2 = parseInt(s.t2, 10);
    if (isNaN(t1) || isNaN(t2) || !isValidPickleballScore(t1, t2)) return;
    const winner = t1 > t2 ? 1 : t2 > t1 ? 2 : null;
    const supabase = createClient();
    await supabase.from("open_play_matches").update({
      team1_score: t1,
      team2_score: t2,
      winner_team: winner as 1 | 2 | null,
      played_at: new Date().toISOString(),
    }).eq("id", matchId);
    const scoredMatch = matches.find((m) => m.id === matchId);
    const updatedMatches = matches.map((m) =>
      m.id === matchId
        ? { ...m, team1_score: t1, team2_score: t2, winner_team: winner as 1 | 2 | null }
        : m
    );
    setMatches(updatedMatches);
    if (scoredMatch) await fillFreeCourts(updatedMatches);
  }

  async function skipMatch(matchId: string) {
    const supabase = createClient();
    const skippedMatch = matches.find((m) => m.id === matchId);
    await supabase.from("open_play_matches").delete().eq("id", matchId);
    const updatedMatches = matches.filter((m) => m.id !== matchId);
    setMatches(updatedMatches);
    if (swapTarget?.matchId === matchId) {
      setSwapTarget(null);
      setPickerOpen(false);
    }
    if (skippedMatch) await fillFreeCourts(updatedMatches);
  }

  async function removePlayer(matchId: string, slot: SlotKey) {
    setSwapTarget(null);
    setPickerOpen(false);
    const supabase = createClient();
    await supabase.from("open_play_matches").update({ [slot]: null }).eq("id", matchId);
    setMatches((prev) =>
      prev.map((m) => m.id === matchId ? { ...m, [slot]: null } : m)
    );
    setSwapTarget({ matchId, slot });
    // Don't auto-open picker; user must click the empty slot
  }

  // Called when user clicks an empty slot — opens the picker
  function handleEmptySlotClick(matchId: string, slot: SlotKey) {
    setSwapTarget({ matchId, slot });
    setPickerOpen(true);
  }

  // Called when user selects a player in the popup
  async function handlePlayerSelected(newPlayerId: string, buttonEl: HTMLButtonElement) {
    if (!swapTarget || fillingSlot) return;
    const { matchId, slot } = swapTarget;
    const slotKey = `${matchId}::${slot}`;
    const slotEl = slotRefs.current[slotKey];

    setFillingSlot(newPlayerId);
    setPickerOpen(false);

    if (slotEl) {
      // Measure positions
      const fromRect = buttonEl.getBoundingClientRect();
      const toRect = slotEl.getBoundingClientRect();

      const fromX = fromRect.left + fromRect.width / 2;
      const fromY = fromRect.top + fromRect.height / 2;
      const toX = toRect.left + toRect.width / 2;
      const toY = toRect.top + toRect.height / 2;

      setBallFlight({
        fromX, fromY, toX, toY,
        onComplete: async () => {
          setBallFlight(null);
          // Impact flash
          setImpactSlot(slotKey);
          setTimeout(() => setImpactSlot(null), 400);
          // Assign in DB + state
          const supabase = createClient();
          await supabase.from("open_play_matches").update({ [slot]: newPlayerId }).eq("id", matchId);
          setMatches((prev) =>
            prev.map((m) => m.id === matchId ? { ...m, [slot]: newPlayerId } : m)
          );
          setSwapTarget(null);
          setFillingSlot(null);
        },
      });
    } else {
      // No DOM ref — just assign directly
      const supabase = createClient();
      await supabase.from("open_play_matches").update({ [slot]: newPlayerId }).eq("id", matchId);
      setMatches((prev) =>
        prev.map((m) => m.id === matchId ? { ...m, [slot]: newPlayerId } : m)
      );
      setSwapTarget(null);
      setFillingSlot(null);
    }
  }

  async function endSession() {
    const supabase = createClient();
    const unscoredIds = matches.filter((m) => m.winner_team === null).map((m) => m.id);
    if (unscoredIds.length > 0) {
      await supabase.from("open_play_matches").delete().in("id", unscoredIds);
      setMatches((prev) => prev.filter((m) => m.winner_team !== null));
    }
    await supabase.from("open_plays").update({ status: "completed" }).eq("id", session.id);
    setSessionStatus("completed");
    startTransition(() => router.refresh());
  }

  const pendingMatches = matches
    .filter((m) => m.winner_team === null)
    .sort((a, b) => a.court_number - b.court_number);
  const scoredMatches = matches
    .filter((m) => m.winner_team !== null)
    .sort((a, b) => b.round_number - a.round_number || b.court_number - a.court_number);
  const sortedMatches = [...pendingMatches, ...scoredMatches];

  // Available players = participants not currently in any pending match slot
  const busyPlayerIds = new Set<string>();
  for (const m of pendingMatches) {
    [m.team1_player1, m.team1_player2, m.team2_player1, m.team2_player2]
      .filter(Boolean)
      .forEach((id) => busyPlayerIds.add(id!));
  }
  const availablePlayers = [...participants].filter((id) => !busyPlayerIds.has(id));

  const pickerPlayers = availablePlayers.map((id) => {
    const member = memberMap.get(id);
    const name = member?.nickname ?? member?.full_name ?? id.slice(0, 8);
    const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    return { id, name, initials, isGuest: member?.is_guest ?? false };
  });

  return (
    <div className="space-y-6">
      {/* Participants Panel */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <button
          className="flex w-full items-center justify-between px-5 py-4"
          onClick={() => setParticipantsOpen((o) => !o)}
        >
          <h2 className="font-semibold text-white">Participants ({participants.size})</h2>
          <div className="flex items-center gap-2">
            {sessionStatus === "scheduled" && (
              <span className="text-xs text-white/40">Toggle to add/remove</span>
            )}
            {participantsOpen ? (
              <ChevronUp className="h-4 w-4 text-white/40" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/40" />
            )}
          </div>
        </button>
        {participantsOpen && (
          <div className="flex flex-wrap gap-2 border-t border-white/8 px-5 pb-5 pt-4">
            {allMembers.map((m) => {
              const isIn = participants.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => sessionStatus !== "completed" && toggleParticipant(m.id)}
                  disabled={sessionStatus === "completed"}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-all",
                    isIn ? "bg-brand-lime text-brand-dark" : "bg-white/10 text-white/60 hover:bg-white/20",
                    m.is_guest && "border border-dashed",
                    sessionStatus === "completed" && "cursor-default opacity-70"
                  )}
                >
                  <UserPlus className="mr-1 inline-block h-3 w-3" />
                  {m.nickname ?? m.full_name}
                  {m.is_guest && " (G)"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Standings Panel */}
      {(() => {
        const stats: Record<string, { wins: number; losses: number; diff: number }> = {};
        const addPlayer = (id: string) => { if (!stats[id]) stats[id] = { wins: 0, losses: 0, diff: 0 }; };
        for (const m of matches) {
          if (m.winner_team === null) continue;
          const t1 = [m.team1_player1, m.team1_player2].filter(Boolean) as string[];
          const t2 = [m.team2_player1, m.team2_player2].filter(Boolean) as string[];
          t1.forEach(addPlayer); t2.forEach(addPlayer);
          const s1 = m.team1_score ?? 0;
          const s2 = m.team2_score ?? 0;
          if (m.winner_team === 1) {
            t1.forEach((id) => { stats[id].wins++; stats[id].diff += s1 - s2; });
            t2.forEach((id) => { stats[id].losses++; stats[id].diff += s2 - s1; });
          } else {
            t2.forEach((id) => { stats[id].wins++; stats[id].diff += s2 - s1; });
            t1.forEach((id) => { stats[id].losses++; stats[id].diff += s1 - s2; });
          }
        }
        const allIds = new Set([...Object.keys(stats), ...participants]);
        const rows = [...allIds]
          .map((id) => ({ id, ...(stats[id] ?? { wins: 0, losses: 0, diff: 0 }) }))
          .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.diff - a.diff);
        if (rows.length === 0) return null;
        return (
          <div className="rounded-xl border border-white/10 bg-white/5">
            <button
              className="flex w-full items-center justify-between px-5 py-4"
              onClick={() => setStandingsOpen((o) => !o)}
            >
              <h2 className="font-semibold text-white">Standings</h2>
              {standingsOpen ? (
                <ChevronUp className="h-4 w-4 text-white/40" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/40" />
              )}
            </button>
            {standingsOpen && (
              <div className="border-t border-white/8 px-4 pb-5 pt-4">
                <OpenPlayStandings rows={rows} memberMap={memberMap} />
              </div>
            )}
          </div>
        );
      })()}

      {/* Actions */}
      {sessionStatus !== "completed" && (
        <div className="flex flex-wrap gap-3">
          {sessionStatus === "scheduled" && participants.size >= (isSingles ? 2 : 4) && (
            <Button onClick={generateNextRound}>
              <Play className="h-4 w-4" />
              Start Session
            </Button>
          )}
          {sessionStatus === "active" && (
            <>
              <Button variant="secondary" onClick={() => fillFreeCourts(matches, true)}>
                Check for Match
              </Button>
              <Button variant="danger" onClick={() => setConfirmEnd(true)}>
                <StopCircle className="h-4 w-4" />
                End Session
              </Button>
            </>
          )}
        </div>
      )}

      {/* Matches */}
      {sortedMatches.length > 0 && (
        <div className="space-y-2">
          {sortedMatches.map((m) => {
            const t1Names = [playerName(m.team1_player1), m.team1_player2 ? playerName(m.team1_player2) : null]
              .filter(Boolean).join(" & ");
            const t2Names = [playerName(m.team2_player1), m.team2_player2 ? playerName(m.team2_player2) : null]
              .filter(Boolean).join(" & ");
            const scored = m.winner_team !== null;

            return (
              <div
                key={m.id}
                className={cn(
                  "overflow-hidden rounded-xl border",
                  scored
                    ? "border-brand-lime/15 bg-brand-lime/[0.04]"
                    : "border-white/10 bg-white/[0.03]"
                )}
              >
                {/* Card header */}
                <div className={cn(
                  "flex items-center justify-between px-4 py-2.5",
                  scored ? "border-b border-brand-lime/10" : "border-b border-white/[0.06]"
                )}>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold",
                      scored ? "bg-brand-lime/15 text-brand-lime" : "bg-white/8 text-white/50"
                    )}>
                      {m.court_number}
                    </div>
                    <span className="text-xs font-medium text-white/40">Court {m.court_number}</span>
                  </div>
                  {!scored && sessionStatus === "active" && (
                    <button
                      onClick={() => skipMatch(m.id)}
                      className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/20 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      Skip
                    </button>
                  )}
                  {scored && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-lime/50">
                      Done
                    </span>
                  )}
                </div>

                <div className="p-3">
                  {/* Active unscored */}
                  {!scored && sessionStatus === "active" ? (
                    <div className="space-y-3">
                      {/* Teams */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
                        {/* Team 1 */}
                        <div className="space-y-1.5">
                          <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/25">
                            Team 1
                          </span>
                          <div className="flex flex-col gap-1.5">
                            {(["team1_player1", "team1_player2"] as const)
                              .filter((slot) => !isSingles || slot === "team1_player1")
                              .map((slot) => {
                                const pid = m[slot];
                                const slotKey = `${m.id}::${slot}`;
                                const isImpact = impactSlot === slotKey;

                                if (pid) {
                                  return (
                                    <motion.div
                                      key={slot}
                                      layout
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="group relative flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.06] px-3 py-2 transition-colors hover:border-red-500/25 hover:bg-red-500/[0.06]"
                                    >
                                      <span className="truncate text-xs font-semibold text-white/90 group-hover:text-white">
                                        {playerName(pid)}
                                      </span>
                                      <button
                                        onClick={() => removePlayer(m.id, slot)}
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/30 transition-all hover:border-red-500/40 hover:bg-red-500/20 hover:text-red-400 active:scale-95"
                                        title="Remove player"
                                      >
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    </motion.div>
                                  );
                                }

                                // Empty slot
                                return (
                                  <motion.div
                                    key={slot}
                                    layout
                                    ref={(el) => { slotRefs.current[slotKey] = el; }}
                                    onClick={() => handleEmptySlotClick(m.id, slot)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="relative flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-brand-lime/30 bg-brand-lime/[0.04] px-3 py-2 transition-colors hover:border-brand-lime/50 hover:bg-brand-lime/[0.08]"
                                  >
                                    <ImpactFlash visible={isImpact} />
                                    <div className="flex h-4 w-4 items-center justify-center rounded-full border border-brand-lime/40 bg-brand-lime/10">
                                      <Plus className="h-2.5 w-2.5 text-brand-lime" />
                                    </div>
                                    <span className="text-xs font-medium text-brand-lime/60">
                                      Open slot
                                    </span>
                                  </motion.div>
                                );
                              })}
                          </div>
                        </div>

                        {/* VS */}
                        <div className="flex flex-col items-center pt-6">
                          <span className="text-[10px] font-bold tracking-widest text-white/20">VS</span>
                        </div>

                        {/* Team 2 */}
                        <div className="space-y-1.5">
                          <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/25">
                            Team 2
                          </span>
                          <div className="flex flex-col gap-1.5">
                            {(["team2_player1", "team2_player2"] as const)
                              .filter((slot) => !isSingles || slot === "team2_player1")
                              .map((slot) => {
                                const pid = m[slot];
                                const slotKey = `${m.id}::${slot}`;
                                const isImpact = impactSlot === slotKey;

                                if (pid) {
                                  return (
                                    <motion.div
                                      key={slot}
                                      layout
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="group relative flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.06] px-3 py-2 transition-colors hover:border-red-500/25 hover:bg-red-500/[0.06]"
                                    >
                                      <span className="truncate text-xs font-semibold text-white/90 group-hover:text-white">
                                        {playerName(pid)}
                                      </span>
                                      <button
                                        onClick={() => removePlayer(m.id, slot)}
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/30 transition-all hover:border-red-500/40 hover:bg-red-500/20 hover:text-red-400 active:scale-95"
                                        title="Remove player"
                                      >
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    </motion.div>
                                  );
                                }

                                return (
                                  <motion.div
                                    key={slot}
                                    layout
                                    ref={(el) => { slotRefs.current[slotKey] = el; }}
                                    onClick={() => handleEmptySlotClick(m.id, slot)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="relative flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-brand-lime/30 bg-brand-lime/[0.04] px-3 py-2 transition-colors hover:border-brand-lime/50 hover:bg-brand-lime/[0.08]"
                                  >
                                    <ImpactFlash visible={isImpact} />
                                    <div className="flex h-4 w-4 items-center justify-center rounded-full border border-brand-lime/40 bg-brand-lime/10">
                                      <Plus className="h-2.5 w-2.5 text-brand-lime" />
                                    </div>
                                    <span className="text-xs font-medium text-brand-lime/60">
                                      Open slot
                                    </span>
                                  </motion.div>
                                );
                              })}
                          </div>
                        </div>
                      </div>

                      {/* Score inputs */}
                      <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3">
                        {(() => {
                          const t1v = parseInt(scores[m.id]?.t1 ?? "", 10);
                          const t2v = parseInt(scores[m.id]?.t2 ?? "", 10);
                          const valid = !isNaN(t1v) && !isNaN(t2v) && isValidPickleballScore(t1v, t2v);
                          return (
                            <>
                              <input
                                type="number"
                                min="0"
                                placeholder="T1"
                                className="h-8 w-14 rounded border border-white/20 bg-[#1a2a1f] px-2 text-center text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-lime"
                                value={scores[m.id]?.t1 ?? ""}
                                onChange={(e) => setScores((prev) => ({ ...prev, [m.id]: { t1: e.target.value, t2: prev[m.id]?.t2 ?? "" } }))}
                              />
                              <button
                                onClick={() => submitScore(m.id)}
                                disabled={!valid}
                                className="rounded-lg bg-brand-lime px-2.5 py-1.5 text-xs font-bold text-brand-dark transition disabled:opacity-30"
                              >
                                ✓
                              </button>
                              <input
                                type="number"
                                min="0"
                                placeholder="T2"
                                className="h-8 w-14 rounded border border-white/20 bg-[#1a2a1f] px-2 text-center text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-lime"
                                value={scores[m.id]?.t2 ?? ""}
                                onChange={(e) => setScores((prev) => ({ ...prev, [m.id]: { t1: prev[m.id]?.t1 ?? "", t2: e.target.value } }))}
                              />
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    /* Scored / scheduled view */
                    <div className="flex items-center gap-2">
                      <span className={cn("flex-1 text-sm font-semibold", m.winner_team === 1 ? "text-brand-lime" : "text-white")}>
                        {t1Names}
                      </span>
                      {scored ? (
                        <>
                          <span className="text-sm font-bold tabular-nums text-white">{m.team1_score}</span>
                          <span className="text-white/30">—</span>
                          <span className="text-sm font-bold tabular-nums text-white">{m.team2_score}</span>
                        </>
                      ) : (
                        <span className="text-xs text-white/30">vs</span>
                      )}
                      <span className={cn("flex-1 text-right text-sm font-semibold", m.winner_team === 2 ? "text-brand-lime" : "text-white")}>
                        {t2Names}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sessionStatus === "completed" && (
        <div className="rounded-xl border border-brand-lime/20 bg-brand-lime/5 p-4 text-sm text-brand-lime">
          Session completed. Stats have been recorded.
        </div>
      )}

      {/* Confirm end session */}
      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmEnd(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1810] p-6 shadow-xl">
            <h3 className="mb-2 text-base font-bold text-white">End this session?</h3>
            <p className="mb-6 text-sm text-white/50">
              All unscored matches will be removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEnd(false)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => { setConfirmEnd(false); endSession(); }}
                disabled={isPending}
                className="flex-1 rounded-xl bg-red-500/80 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {isPending ? "Ending…" : "Yes, End Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player picker popup */}
      {pickerOpen && swapTarget && (
        <PlayerPickerPopup
          players={pickerPlayers}
          onSelect={handlePlayerSelected}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Flying ball — rendered at root level so it flies across the full viewport */}
      {ballFlight && <FlyingBall flight={ballFlight} />}
    </div>
  );
}
