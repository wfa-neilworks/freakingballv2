"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Users,
  PlayCircle,
  Trophy,
  BarChart3,
  UserPlus,
  CalendarDays,
  Activity,
  ArrowRight,
  Clock,
  MapPin,
  ChevronRight,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
export interface DashboardData {
  clubName: string;
  memberCount: number;
  guestCount: number;
  openPlayCount: number;
  tournamentCount: number;
  recentSessions: {
    id: string;
    name: string;
    status: string;
    date_time: string;
    location: string;
    play_type: string;
  }[];
  recentTournaments: {
    id: string;
    name: string;
    status: string;
    created_at: string;
    event_count: number;
  }[];
}

/* ─────────────────────────────────────────────────────────────
   Animated counter
───────────────────────────────────────────────────────────── */
function Counter({ target, duration = 1 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return <>{count}</>;
}

/* ─────────────────────────────────────────────────────────────
   Shared animation presets
───────────────────────────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease },
});

/* ─────────────────────────────────────────────────────────────
   Panel – reusable surface wrapper
───────────────────────────────────────────────────────────── */
function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.07] ${className}`}
      style={{ background: "rgba(255,255,255,0.035)" }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Panel header row
───────────────────────────────────────────────────────────── */
function PanelHeader({
  icon,
  iconBg,
  title,
  action,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Status badge pill
───────────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  active:       { dot: "#b7ff72", label: "Active" },
  scheduled:    { dot: "#60a5fa", label: "Scheduled" },
  completed:    { dot: "#ffffff40", label: "Completed" },
  cancelled:    { dot: "#f87171", label: "Cancelled" },
  draft:        { dot: "#ffffff30", label: "Draft" },
  registration: { dot: "#c084fc", label: "Registration" },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        background: `${cfg.dot}14`,
        color: cfg.dot,
        border: `1px solid ${cfg.dot}30`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main dashboard component
───────────────────────────────────────────────────────────── */
export function DashboardClient({ data }: { data: DashboardData }) {
  const {
    clubName,
    memberCount,
    guestCount,
    openPlayCount,
    tournamentCount,
    recentSessions,
    recentTournaments,
  } = data;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
  });

  /* KPI card definitions */
  const kpis = [
    {
      label: "Club Members",
      sublabel: "Active members",
      value: memberCount,
      icon: Users,
      href: "/club/members",
      accentHex: "#b7ff72",
    },
    {
      label: "Guest Players",
      sublabel: "Registered guests",
      value: guestCount,
      icon: Users,
      href: "/club/members?tab=guests",
      accentHex: "#86efac",
    },
    {
      label: "Open Plays",
      sublabel: "Active sessions",
      value: openPlayCount,
      icon: PlayCircle,
      href: "/club/open-play",
      accentHex: "#60a5fa",
    },
    {
      label: "Tournaments",
      sublabel: "Running now",
      value: tournamentCount,
      icon: Trophy,
      href: "/club/tournaments",
      accentHex: "#fbbf24",
    },
  ];

  /* Quick action definitions */
  const actions = [
    {
      href: "/club/members/new",
      label: "Add Member",
      desc: "Invite a new member to your club",
      icon: UserPlus,
      accentHex: "#b7ff72",
    },
    {
      href: "/club/open-play/new",
      label: "Start Open Play",
      desc: "Create a new open play session",
      icon: PlayCircle,
      accentHex: "#60a5fa",
    },
    {
      href: "/club/tournaments/new",
      label: "New Tournament",
      desc: "Set up and manage a tournament",
      icon: Trophy,
      accentHex: "#fbbf24",
    },
    {
      href: "/club/stats",
      label: "View Player Stats",
      desc: "Explore performance and leaderboards",
      icon: BarChart3,
      accentHex: "#b7ff72",
    },
  ];

  /* Merge activity: sessions + tournaments, sorted by date */
  const allActivity = [
    ...recentSessions.map((s) => ({
      id: s.id,
      type: "session" as const,
      title: s.name,
      meta: s.location,
      status: s.status,
      date: new Date(s.date_time),
      href: `/club/open-play/${s.id}`,
      icon: PlayCircle,
      accentHex: "#60a5fa",
    })),
    ...recentTournaments.map((t) => ({
      id: t.id,
      type: "tournament" as const,
      title: t.name,
      meta: `${t.event_count} event${t.event_count !== 1 ? "s" : ""}`,
      status: t.status,
      date: new Date(t.created_at),
      href: `/club/tournaments/${t.id}`,
      icon: Trophy,
      accentHex: "#fbbf24",
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 6);

  const hasActivity = allActivity.length > 0;

  /* Upcoming: sessions that are scheduled or active, sorted soonest first */
  const upcoming = recentSessions
    .filter((s) => s.status === "scheduled" || s.status === "active")
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl space-y-7">

      {/* ══════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════ */}
      <motion.div {...fadeUp(0)} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-lime/60">Club Overview</p>
          <h1 className="mt-0.5 text-2xl font-black text-white leading-tight">{clubName}</h1>
          <p className="mt-0.5 text-sm text-white/35">
            Welcome back — here&apos;s what&apos;s happening at your club.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 sm:self-auto">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-white/25" />
          <span className="text-xs font-medium text-white/40">{dateStr}</span>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════
          KPI CARDS — 4 across, equal height
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ label, sublabel, value, icon: Icon, href, accentHex }, i) => (
          <motion.div key={label} {...fadeUp(0.06 + i * 0.06)}>
            <Link href={href} className="group block h-full">
              {/* Card surface — slightly lighter than page bg */}
              <div
                className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.025) 100%)",
                }}
              >
                {/* Accent line top */}
                <div
                  className="absolute inset-x-0 top-0 h-[2px] opacity-50 transition-opacity duration-200 group-hover:opacity-90"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, ${accentHex} 50%, transparent 100%)`,
                  }}
                />

                {/* Icon + arrow */}
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: `${accentHex}1a` }}
                  >
                    <Icon className="h-[18px] w-[18px]" style={{ color: accentHex }} />
                  </div>
                  <ChevronRight
                    className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-50"
                    style={{ color: accentHex }}
                  />
                </div>

                {/* Number */}
                <div className="mt-5">
                  <p
                    className="text-[2.6rem] font-black leading-none tabular-nums"
                    style={{ color: accentHex }}
                  >
                    <Counter target={value} />
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white/75">{label}</p>
                  <p className="mt-0.5 text-[11px] text-white/30">{sublabel}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════
          BODY — 60 / 40 two-column
      ══════════════════════════════════════════════════ */}
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:[grid-template-columns:1fr_340px]">

        {/* ── LEFT: Quick Actions ── */}
        <motion.div {...fadeUp(0.28)}>
          <Panel>
            <PanelHeader
              icon={<Activity className="h-3.5 w-3.5 text-brand-lime" />}
              iconBg="bg-brand-lime/15"
              title="Quick Actions"
            />
            <div className="grid grid-cols-2 gap-3 p-4">
              {actions.map(({ href, label, desc, icon: Icon, accentHex }, i) => (
                <motion.div
                  key={href}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 + i * 0.05, duration: 0.28, ease }}
                >
                  <Link href={href} className="group block h-full">
                    <div
                      className="relative flex h-full flex-col gap-4 overflow-hidden rounded-xl border border-white/[0.07] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.13] hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      {/* Subtle accent glow on hover */}
                      <div
                        className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        style={{
                          background: `radial-gradient(circle at 0% 0%, ${accentHex}08 0%, transparent 60%)`,
                        }}
                      />

                      <div className="flex items-center justify-between">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
                          style={{ background: `${accentHex}1a` }}
                        >
                          <Icon className="h-[18px] w-[18px]" style={{ color: accentHex }} />
                        </div>
                        <ArrowRight
                          className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-60"
                          style={{ color: accentHex }}
                        />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white leading-tight">{label}</p>
                        <p className="mt-1 text-[11px] leading-snug text-white/35">{desc}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </Panel>
        </motion.div>

        {/* ── RIGHT: Recent Activity ── */}
        <motion.div {...fadeUp(0.34)}>
          <Panel className="flex h-full flex-col">
            <PanelHeader
              icon={<Clock className="h-3.5 w-3.5 text-white/40" />}
              iconBg="bg-white/8"
              title="Recent Activity"
              action={
                hasActivity ? (
                  <Link
                    href="/club/open-play"
                    className="text-[11px] font-medium text-white/30 transition-colors hover:text-brand-lime"
                  >
                    View all →
                  </Link>
                ) : undefined
              }
            />

            {!hasActivity && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07]"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <Activity className="h-5 w-5 text-white/15" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/30">No activity yet</p>
                  <p className="mt-1 text-xs text-white/15">
                    Sessions and tournaments will appear here
                  </p>
                </div>
              </div>
            )}

            {hasActivity && (
              <div className="flex-1 overflow-hidden">
                {allActivity.map((item, i) => (
                  <motion.div
                    key={item.id + item.type}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.38 + i * 0.045, duration: 0.28, ease }}
                  >
                    <Link
                      href={item.href}
                      className="group flex items-center gap-3 border-b border-white/[0.05] px-5 py-3.5 last:border-b-0 transition-colors duration-150 hover:bg-white/[0.03]"
                    >
                      {/* Icon */}
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: `${item.accentHex}15` }}
                      >
                        <item.icon className="h-3.5 w-3.5" style={{ color: item.accentHex }} />
                      </div>

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-white/80 group-hover:text-white transition-colors">
                          {item.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/25">
                          {item.type === "session" && (
                            <MapPin className="h-3 w-3 shrink-0" />
                          )}
                          <span className="truncate">{item.meta}</span>
                          <span className="shrink-0">·</span>
                          <span className="shrink-0">
                            {item.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <StatusPill status={item.status} />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </Panel>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════
          UPCOMING SESSIONS (only when data exists)
      ══════════════════════════════════════════════════ */}
      {upcoming.length > 0 && (
        <motion.div {...fadeUp(0.46)}>
          <Panel>
            <PanelHeader
              icon={<CalendarDays className="h-3.5 w-3.5 text-blue-400" />}
              iconBg="bg-blue-500/15"
              title="Upcoming Sessions"
              action={
                <Link
                  href="/club/open-play"
                  className="text-[11px] font-medium text-white/30 transition-colors hover:text-blue-400"
                >
                  View all →
                </Link>
              }
            />
            <div className="grid gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.05, duration: 0.25, ease }}
                >
                  <Link href={`/club/open-play/${s.id}`} className="group block">
                    <div
                      className="rounded-xl border border-white/[0.07] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-md"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-white/85 group-hover:text-white transition-colors leading-tight">
                          {s.name}
                        </p>
                        <StatusPill status={s.status} />
                      </div>
                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            {new Date(s.date_time).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            ·{" "}
                            {new Date(s.date_time).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.location}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </Panel>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════
          ONBOARDING NUDGE (new clubs only)
      ══════════════════════════════════════════════════ */}
      {memberCount === 0 && (
        <motion.div {...fadeUp(0.5)}>
          <div
            className="relative overflow-hidden rounded-2xl border border-brand-lime/[0.18] p-5"
            style={{ background: "linear-gradient(135deg, rgba(183,255,114,0.06) 0%, rgba(183,255,114,0.02) 100%)" }}
          >
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-brand-lime/[0.06] blur-2xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-lime/15">
                <Users className="h-5 w-5 text-brand-lime" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Your club is ready — add your first members</p>
                <p className="mt-0.5 text-sm text-white/40">
                  Invite players so they appear in open play and tournaments.
                </p>
              </div>
              <Link
                href="/club/members/new"
                className="shrink-0 self-start rounded-xl bg-brand-lime px-4 py-2.5 text-sm font-bold text-brand-dark transition-all hover:bg-brand-lime/90 hover:shadow-[0_0_20px_rgba(183,255,114,0.25)] sm:self-auto"
              >
                Add Member
              </Link>
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
}
