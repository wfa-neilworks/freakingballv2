"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  PlayCircle,
  Plus,
  Calendar,
  MapPin,
  Hash,
  Users2,
  Shuffle,
  CheckCircle2,
  Clock,
  XCircle,
  Activity,
  ChevronRight,
  Search,
} from "lucide-react";
import { OpenPlayFormModal } from "@/components/club/open-play-form-modal";
import type { SessionStatus } from "@/types/database";

/* ─── Types ──────────────────────────────────────────────── */
export interface SessionRow {
  id: string;
  name: string;
  play_type: string;
  doubles_category: string | null;
  partner_mode: string | null;
  date_time: string;
  location: string;
  num_courts: number;
  status: SessionStatus;
}

interface OpenPlayListClientProps {
  sessions: SessionRow[];
  clubId: string;
  adminId: string;
}

/* ─── Constants ──────────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; border: string }> = {
  scheduled:  { label: "Scheduled",  dot: "#60a5fa", bg: "rgba(96,165,250,0.1)",   border: "rgba(96,165,250,0.2)" },
  active:     { label: "Active",     dot: "#b7ff72", bg: "rgba(183,255,114,0.1)",  border: "rgba(183,255,114,0.2)" },
  completed:  { label: "Completed",  dot: "#a78bfa", bg: "rgba(167,139,250,0.1)",  border: "rgba(167,139,250,0.2)" },
  cancelled:  { label: "Cancelled",  dot: "#f87171", bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.2)" },
};

const PLAY_TYPE_LABEL: Record<string, string> = {
  singles:       "Singles",
  doubles:       "Doubles",
  mixed_doubles: "Mixed Doubles",
  open_doubles:  "Open Doubles",
};

const FILTER_TABS: { label: string; value: SessionStatus | "all" }[] = [
  { label: "All",       value: "all" },
  { label: "Upcoming",  value: "scheduled" },
  { label: "Active",    value: "active" },
  { label: "Completed", value: "completed" },
];

/* ─── Stat card ─────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, accentHex, delay }: {
  icon: React.ElementType; label: string; value: number; accentHex: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease }}
    >
      <div
        className="flex items-center gap-3 rounded-xl border border-white/[0.07] p-4"
        style={{ background: "rgba(255,255,255,0.035)" }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accentHex}18` }}>
          <Icon className="h-4 w-4" style={{ color: accentHex }} />
        </div>
        <div>
          <p className="text-xl font-black leading-none" style={{ color: accentHex }}>{value}</p>
          <p className="mt-0.5 text-[11px] text-white/35">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Status badge pill ─────────────────────────────────── */
function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: cfg.bg, color: cfg.dot, border: `1px solid ${cfg.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

/* ─── Session card ───────────────────────────────────────── */
function SessionCard({ session, delay }: { session: SessionRow; delay: number }) {
  const dt = new Date(session.date_time);
  const dateStr = dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeStr = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const playLabel = PLAY_TYPE_LABEL[session.play_type] ?? session.play_type;
  const catLabel = session.doubles_category === "mens" ? "Men's" : session.doubles_category === "womens" ? "Women's" : null;
  const partnerLabel = session.partner_mode === "rotating" ? "Rotating" : session.partner_mode === "fixed" ? "Fixed" : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease }}
    >
      <Link href={`/club/open-play/${session.id}`} className="group block h-full">
        <div
          className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.13] hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
          style={{ background: "rgba(255,255,255,0.035)" }}
        >
          {/* Top accent line keyed to status */}
          <div
            className="absolute inset-x-0 top-0 h-[2px] opacity-60 transition-opacity group-hover:opacity-100"
            style={{
              background: `linear-gradient(90deg, transparent, ${STATUS_CONFIG[session.status]?.dot ?? "#b7ff72"}60, transparent)`,
            }}
          />

          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${STATUS_CONFIG[session.status]?.dot ?? "#b7ff72"}15` }}>
              <PlayCircle className="h-4.5 w-4.5 h-[18px] w-[18px]"
                style={{ color: STATUS_CONFIG[session.status]?.dot ?? "#b7ff72" }} />
            </div>
            <StatusPill status={session.status} />
          </div>

          {/* Session name */}
          <h3 className="mt-3 text-sm font-bold text-white/90 group-hover:text-white transition-colors leading-snug">
            {session.name}
          </h3>

          {/* Meta pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/50">
              <Users2 className="h-3 w-3" />{playLabel}{catLabel ? ` · ${catLabel}` : ""}
            </span>
            {partnerLabel && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/50">
                <Shuffle className="h-3 w-3" />{partnerLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/50">
              <Hash className="h-3 w-3" />{session.num_courts} court{session.num_courts !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Date + location */}
          <div className="mt-4 space-y-1.5 border-t border-white/[0.05] pt-4">
            <div className="flex items-center gap-2 text-[11px] text-white/30">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{dateStr} · {timeStr}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-white/30">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{session.location}</span>
            </div>
          </div>

          {/* View details row */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] font-medium text-white/20 transition-colors group-hover:text-brand-lime/70">
              View details
            </span>
            <ChevronRight className="h-3.5 w-3.5 -translate-x-1 text-white/15 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-60 group-hover:text-brand-lime" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Empty state ────────────────────────────────────────── */
function EmptyState({ filter, onNew }: { filter: string; onNew: () => void }) {
  const hasFilter = filter !== "all";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.07] py-20 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07]"
        style={{ background: "rgba(255,255,255,0.04)" }}>
        <PlayCircle className="h-6 w-6 text-white/15" />
      </div>
      <p className="font-semibold text-white/35">
        {hasFilter ? `No ${filter} sessions` : "No sessions yet"}
      </p>
      <p className="mt-1 max-w-[220px] text-sm text-white/20">
        {hasFilter ? "Try a different filter" : "Create your first open play session"}
      </p>
      {!hasFilter && (
        <button
          onClick={onNew}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-lime px-4 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-brand-lime/90"
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      )}
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export function OpenPlayListClient({ sessions, clubId, adminId }: OpenPlayListClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<SessionStatus | "all">("all");
  const [search, setSearch] = useState("");

  /* Computed stats */
  const total     = sessions.length;
  const upcoming  = sessions.filter((s) => s.status === "scheduled").length;
  const active    = sessions.filter((s) => s.status === "active").length;
  const completed = sessions.filter((s) => s.status === "completed").length;

  /* Filtered list */
  const filtered = useMemo(() => {
    let list = sessions;
    if (filter !== "all") list = list.filter((s) => s.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sessions, filter, search]);

  return (
    <>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/12">
              <PlayCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-tight">Open Play</h1>
              <p className="text-xs text-white/35">Organize and manage play sessions</p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-brand-lime px-4 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-brand-lime/90 hover:shadow-[0_0_20px_rgba(183,255,114,0.2)] sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            New Session
          </button>
        </motion.div>

        {/* ── Stats row ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Activity}    label="Total"     value={total}     accentHex="#b7ff72" delay={0.05} />
          <StatCard icon={Clock}       label="Upcoming"  value={upcoming}  accentHex="#60a5fa" delay={0.09} />
          <StatCard icon={PlayCircle}  label="Active"    value={active}    accentHex="#34d399" delay={0.13} />
          <StatCard icon={CheckCircle2}label="Completed" value={completed} accentHex="#a78bfa" delay={0.17} />
        </div>

        {/* ── Filter row ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.1, ease }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          {/* Segmented tabs */}
          <div
            className="flex shrink-0 overflow-hidden rounded-xl border border-white/[0.07] p-1"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            {FILTER_TABS.map((t) => {
              const active = filter === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setFilter(t.value)}
                  className="rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-200"
                  style={{
                    background: active ? "#b7ff72" : "transparent",
                    color: active ? "#18251D" : "rgba(255,255,255,0.35)",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div
            className="flex flex-1 items-center gap-2.5 rounded-xl border border-white/[0.07] px-3.5 transition-all duration-150 focus-within:border-brand-lime/40 focus-within:shadow-[0_0_0_3px_rgba(183,255,114,0.06)]"
            style={{ height: "40px", background: "rgba(255,255,255,0.04)" }}
          >
            <Search className="h-4 w-4 shrink-0 text-white/20" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
            />
          </div>
        </motion.div>

        {/* ── Session grid ─────────────────────────────── */}
        {filtered.length === 0 ? (
          <EmptyState filter={filter} onNew={() => setModalOpen(true)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s, i) => (
              <SessionCard key={s.id} session={s} delay={0.18 + i * 0.04} />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-xs text-white/20"
          >
            Showing {filtered.length} of {total} session{total !== 1 ? "s" : ""}
          </motion.p>
        )}
      </div>

      {/* Modal */}
      <OpenPlayFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clubId={clubId}
        adminId={adminId}
      />
    </>
  );
}
