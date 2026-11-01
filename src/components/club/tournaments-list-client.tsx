"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Trophy,
  Plus,
  Search,
  ChevronRight,
  CalendarDays,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  Activity,
  X,
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarArrowUp,
  CalendarArrowDown,
} from "lucide-react";
import { TournamentFormModal } from "@/components/club/tournament-form-modal";
import type { TournamentStatus } from "@/types/database";

/* ─── Types ─────────────────────────────────────────────────── */
export interface TournamentRow {
  id: string;
  name: string;
  status: TournamentStatus;
  created_at: string;
  tournament_events: { id: string }[];
}

interface TournamentsListClientProps {
  tournaments: TournamentRow[];
  clubId: string;
  adminId: string;
}

/* ─── Constants ─────────────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const STATUS_CONFIG: Record<TournamentStatus, {
  label: string;
  dot: string;
  bg: string;
  border: string;
  accentHex: string;
}> = {
  draft:        { label: "Draft",        dot: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.18)", accentHex: "#94a3b8" },
  registration: { label: "Registration", dot: "#60a5fa", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.18)",  accentHex: "#60a5fa" },
  active:       { label: "Active",       dot: "#b7ff72", bg: "rgba(183,255,114,0.08)", border: "rgba(183,255,114,0.2)",  accentHex: "#b7ff72" },
  completed:    { label: "Completed",    dot: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.18)", accentHex: "#a78bfa" },
};

type FilterValue = TournamentStatus | "all";
type SortValue = "newest" | "oldest" | "name_asc" | "name_desc";

const FILTER_TABS: { label: string; value: FilterValue }[] = [
  { label: "All",          value: "all" },
  { label: "Registration", value: "registration" },
  { label: "Active",       value: "active" },
  { label: "Completed",    value: "completed" },
  { label: "Draft",        value: "draft" },
];

const SORT_OPTIONS: { label: string; value: SortValue; icon: React.ElementType }[] = [
  { label: "Newest first",   value: "newest",    icon: CalendarArrowDown },
  { label: "Oldest first",   value: "oldest",    icon: CalendarArrowUp },
  { label: "Name A → Z",    value: "name_asc",  icon: ArrowDownAZ },
  { label: "Name Z → A",    value: "name_desc", icon: ArrowUpAZ },
];

/* ─── Status badge ───────────────────────────────────────────── */
function StatusBadge({ status }: { status: TournamentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: cfg.bg, color: cfg.dot, border: `1px solid ${cfg.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

/* ─── Stat card ─────────────────────────────────────────────── */
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

/* ─── Tournament card ────────────────────────────────────────── */
function TournamentCard({ tournament, delay }: { tournament: TournamentRow; delay: number }) {
  const eventCount = Array.isArray(tournament.tournament_events)
    ? tournament.tournament_events.length
    : 0;
  const cfg = STATUS_CONFIG[tournament.status] ?? STATUS_CONFIG.draft;
  const dateStr = new Date(tournament.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease }}
    >
      <Link href={`/club/tournaments/${tournament.id}`} className="group block">
        <div
          className="relative flex items-center gap-4 overflow-hidden rounded-2xl border px-5 py-4 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,0,0,0.22)]"
          style={{
            background: "rgba(255,255,255,0.035)",
            borderColor: "rgba(255,255,255,0.07)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = `${cfg.accentHex}30`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
          }}
        >
          {/* Left accent line keyed to status */}
          <div
            className="absolute inset-y-0 left-0 w-[3px] rounded-r-full opacity-60 transition-opacity group-hover:opacity-100"
            style={{ background: cfg.accentHex }}
          />

          {/* Icon */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${cfg.accentHex}12` }}
          >
            <Trophy className="h-5 w-5" style={{ color: cfg.accentHex }} />
          </div>

          {/* Main info */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white/90 transition-colors group-hover:text-white">
              {tournament.name}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/30">
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {eventCount} event{eventCount !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {dateStr}
              </span>
            </div>
          </div>

          {/* Status + chevron */}
          <div className="flex shrink-0 items-center gap-2.5">
            <StatusBadge status={tournament.status} />
            <ChevronRight className="h-4 w-4 text-white/15 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white/40" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Empty state ────────────────────────────────────────────── */
function EmptyState({ hasFilter, onNew }: { hasFilter: boolean; onNew: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.07] py-20 text-center"
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07]"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <Trophy className="h-6 w-6 text-white/15" />
      </div>
      <p className="font-semibold text-white/35">
        {hasFilter ? "No tournaments match" : "No tournaments yet"}
      </p>
      <p className="mt-1 max-w-[220px] text-sm text-white/20">
        {hasFilter ? "Try adjusting your search or filters" : "Create your first tournament for your club"}
      </p>
      {!hasFilter && (
        <button
          onClick={onNew}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-lime px-4 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-brand-lime/90"
        >
          <Plus className="h-4 w-4" />
          Create Tournament
        </button>
      )}
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export function TournamentsListClient({ tournaments, clubId, adminId }: TournamentsListClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortValue>("newest");
  const [sortOpen, setSortOpen] = useState(false);

  /* Stats */
  const total      = tournaments.length;
  const active     = tournaments.filter((t) => t.status === "active").length;
  const registered = tournaments.filter((t) => t.status === "registration").length;
  const completed  = tournaments.filter((t) => t.status === "completed").length;

  /* Filtered + sorted list */
  const filtered = useMemo(() => {
    let list = tournaments;
    if (filter !== "all") list = list.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sort === "newest")    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "oldest")    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "name_asc")  return a.name.localeCompare(b.name);
      if (sort === "name_desc") return b.name.localeCompare(a.name);
      return 0;
    });
  }, [tournaments, filter, search, sort]);

  const hasFilter = filter !== "all" || !!search.trim();
  const currentSortOption = SORT_OPTIONS.find((o) => o.value === sort)!;

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
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "rgba(183,255,114,0.1)" }}
            >
              <Trophy className="h-5 w-5 text-brand-lime" />
            </div>
            <div>
              <h1 className="text-xl font-black leading-tight text-white">Tournaments</h1>
              <p className="text-xs text-white/35">
                {total} tournament{total !== 1 ? "s" : ""}{active > 0 ? ` · ${active} active` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-brand-lime px-4 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-brand-lime/90 hover:shadow-[0_0_20px_rgba(183,255,114,0.2)] sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            New Tournament
          </button>
        </motion.div>

        {/* ── Stats row ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Trophy}       label="Total"        value={total}      accentHex="#b7ff72" delay={0.05} />
          <StatCard icon={Activity}     label="Active"       value={active}     accentHex="#34d399" delay={0.09} />
          <StatCard icon={Clock}        label="Registration" value={registered} accentHex="#60a5fa" delay={0.13} />
          <StatCard icon={CheckCircle2} label="Completed"    value={completed}  accentHex="#a78bfa" delay={0.17} />
        </div>

        {/* ── Filter + search + sort ─────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.1, ease }}
          className="space-y-3"
        >
          {/* Top row: filter tabs + sort */}
          <div className="flex items-center justify-between gap-3">
            {/* Filter tabs */}
            <div
              className="flex shrink-0 overflow-x-auto rounded-xl border border-white/[0.07] p-1"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              {FILTER_TABS.map((t) => {
                const isActive = filter === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setFilter(t.value)}
                    className="whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all duration-150"
                    style={{
                      background: isActive ? "#b7ff72" : "transparent",
                      color: isActive ? "#18251D" : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Sort dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setSortOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/[0.07] px-3 py-2 text-[13px] font-medium text-white/40 transition-all hover:border-white/[0.13] hover:text-white/70"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{currentSortOption.label}</span>
              </button>

              <AnimatePresence>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-20 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-white/[0.09] shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
                      style={{ background: "#131f16" }}
                    >
                      {SORT_OPTIONS.map((o) => {
                        const Icon = o.icon;
                        return (
                          <button
                            key={o.value}
                            onClick={() => { setSort(o.value); setSortOpen(false); }}
                            className="flex w-full items-center gap-3 px-4 py-3 text-[13px] font-medium transition-colors hover:bg-white/[0.05]"
                            style={{ color: sort === o.value ? "#b7ff72" : "rgba(255,255,255,0.55)" }}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            {o.label}
                            {sort === o.value && (
                              <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-brand-lime" />
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
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
              placeholder="Search tournaments…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.12 }}
                  type="button"
                  onClick={() => setSearch("")}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/[0.1] hover:text-white/60"
                >
                  <X className="h-3 w-3" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Tournament list ────────────────────────── */}
        {filtered.length === 0 ? (
          <EmptyState hasFilter={hasFilter} onNew={() => setModalOpen(true)} />
        ) : (
          <div className="space-y-2">
            {filtered.map((t, i) => (
              <TournamentCard key={t.id} tournament={t} delay={0.18 + i * 0.03} />
            ))}
          </div>
        )}

        {filtered.length > 0 && total > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-xs text-white/20"
          >
            Showing {filtered.length} of {total} tournament{total !== 1 ? "s" : ""}
          </motion.p>
        )}

      </div>

      {/* Modal */}
      <TournamentFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clubId={clubId}
        adminId={adminId}
      />
    </>
  );
}
