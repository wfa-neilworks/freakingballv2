"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { AuthModal } from "@/components/auth-modal";
import {
  CalendarDays,
  Trophy,
  Users,
  BarChart3,
  Bell,
  Star,
  TrendingUp,
  Shield,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { LegalModal } from "@/components/legal-modal";

// ─── Data ───────────────────────────────────────────────────────────────────

const features = [
  {
    icon: CalendarDays,
    title: "Organize Open Play",
    desc: "Schedule sessions, auto-rotate partners, and manage courts in real time.",
    color: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-400",
    border: "hover:border-blue-500/30",
  },
  {
    icon: Trophy,
    title: "Run Tournaments",
    desc: "Build brackets, track scores, and crown champions effortlessly.",
    color: "from-yellow-500/20 to-yellow-500/5",
    iconColor: "text-yellow-400",
    border: "hover:border-yellow-500/30",
  },
  {
    icon: Users,
    title: "Manage Members",
    desc: "Member profiles, guest tracking, and club roster all in one place.",
    color: "from-brand-lime/20 to-brand-lime/5",
    iconColor: "text-brand-lime",
    border: "hover:border-brand-lime/30",
  },
  {
    icon: BarChart3,
    title: "Track Player Stats",
    desc: "Wins, losses, point differentials, and performance trends over time.",
    color: "from-purple-500/20 to-purple-500/5",
    iconColor: "text-purple-400",
    border: "hover:border-purple-500/30",
  },
  {
    icon: Bell,
    title: "Stay Connected",
    desc: "Live scoreboards, QR sharing, and community updates at your fingertips.",
    color: "from-orange-500/20 to-orange-500/5",
    iconColor: "text-orange-400",
    border: "hover:border-orange-500/30",
  },
];

const statsData = [
  { icon: Users,  value: "1,000+", num: 1000, label: "Active Players" },
  { icon: Trophy, value: "500+",   num: 500,  label: "Tournaments" },
  { icon: Star,   value: "4.8/5",  num: null, label: "User Rating" },
  { icon: Shield, value: "100%",   num: null, label: "Club Focused" },
];

const dashboardStats = [
  { label: "Members",     value: "248", icon: "👥", trend: "+12 this month" },
  { label: "This Week",  value: "12",  icon: "📅", trend: "Sessions played" },
  { label: "Tournaments",value: "3",   icon: "🏆", trend: "Active now" },
];

const leaderboard = [
  { name: "Maria S.",  wins: 18, losses: 3, rank: 1 },
  { name: "James T.",  wins: 15, losses: 5, rank: 2 },
  { name: "Ana R.",    wins: 14, losses: 6, rank: 3 },
  { name: "Carlos M.", wins: 12, losses: 7, rank: 4 },
];

const chartBars = [30, 55, 40, 75, 60, 90, 45, 80, 65, 95, 70, 85];

// ─── Shared variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer = (delay = 0) => ({
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: delay } },
});

// ─── Reusable scroll-reveal wrapper ────────────────────────────────────────

function Reveal({
  children,
  variants = fadeUp,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  variants?: typeof fadeUp;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      variants={{
        ...variants,
        show: { ...variants.show, transition: { ...(variants.show as any).transition, delay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Counting number ────────────────────────────────────────────────────────

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1400;
    const step = 16;
    const increment = to / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= to) { setDisplay(to); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [inView, to]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

// ─── Nav link with animated underline ───────────────────────────────────────

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group relative text-sm font-medium text-white/60 transition-colors hover:text-white">
      {children}
      <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-brand-lime transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modal, setModal] = useState<"privacy" | "terms" | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [authModal, setAuthModal] = useState<"login" | "register" | null>(null);

  // Nav scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Parallax for hero background blobs
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const blobY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0d1810] font-sans text-white">

      {/* ── NAV ── */}
      <motion.header
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] transition-shadow duration-300"
        style={{
          background: "rgba(13,24,16,0.88)",
          backdropFilter: "blur(20px)",
          boxShadow: scrolled ? "0 4px 32px rgba(0,0,0,0.4)" : "none",
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="shrink-0">
            <Image src="/freakingball.png" alt="FreakingBall" width={130} height={44} className="object-contain" priority />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {["Features", "About", "Support"].map((item) => (
              <NavLink key={item} href={`/${item.toLowerCase()}`}>{item}</NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setAuthModal("login")}
              className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white/80 transition-all duration-200 hover:border-brand-lime/40 hover:text-white hover:shadow-[0_0_12px_rgba(183,255,114,0.12)]">
              Login
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => setAuthModal("register")}
              className="rounded-full bg-brand-lime px-5 py-2 text-sm font-bold text-[#0d1810] transition-all duration-200 hover:shadow-[0_0_24px_rgba(183,255,114,0.45)]">
              Sign Up
            </motion.button>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:text-white md:hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={mobileOpen ? "x" : "menu"}
                initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="overflow-hidden border-t border-white/[0.06] bg-[#0d1810] md:hidden"
            >
              <div className="px-6 pb-6 pt-4">
                <nav className="flex flex-col gap-4 mb-6">
                  {["Features", "About", "Support"].map((item) => (
                    <Link key={item} href={`/${item.toLowerCase()}`}
                      onClick={() => setMobileOpen(false)}
                      className="text-sm font-medium text-white/60 hover:text-white transition-colors">
                      {item}
                    </Link>
                  ))}
                </nav>
                <div className="flex flex-col gap-3">
                  <button onClick={() => { setMobileOpen(false); setAuthModal("login"); }}
                    className="rounded-full border border-white/15 py-2.5 text-center text-sm font-semibold text-white">
                    Login
                  </button>
                  <button onClick={() => { setMobileOpen(false); setAuthModal("register"); }}
                    className="rounded-full bg-brand-lime py-2.5 text-center text-sm font-bold text-[#0d1810]">
                    Sign Up
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative pt-16">
        {/* Background layers with parallax */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(183,255,114,1) 1px, transparent 1px), linear-gradient(90deg, rgba(183,255,114,1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }} />
          <motion.div style={{ y: blobY }}
            className="absolute -left-60 top-10 h-[700px] w-[700px] rounded-full bg-brand-lime/[0.06] blur-[120px] animate-glow-pulse" />
          <motion.div style={{ y: blobY }}
            className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-emerald-600/10 blur-[100px]" />
          <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-brand-lime/[0.04] blur-[80px]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:gap-8 lg:py-24">

          {/* LEFT — copy */}
          <motion.div
            className="flex flex-col"
            initial="hidden"
            animate="show"
            variants={staggerContainer(0.1)}
          >
            {/* Badge */}
            <motion.div variants={fadeUp} className="mb-7 inline-flex w-fit items-center gap-2.5 rounded-full border border-brand-lime/25 bg-brand-lime/8 px-4 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-lime opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-lime" />
              </span>
              <span className="text-xs font-semibold tracking-wide text-brand-lime">
                The Ultimate Pickleball Club Management Platform
              </span>
            </motion.div>

            {/* Headline — word by word */}
            <motion.h1
              className="mb-6 text-5xl font-black leading-[1.05] tracking-tight xl:text-6xl"
              variants={staggerContainer(0.05)}
            >
              {["Play.", "Organize."].map((word) => (
                <motion.span key={word} variants={fadeUp} className="inline-block mr-3">
                  {word}
                </motion.span>
              ))}
              <br />
              <motion.span
                variants={{
                  hidden: { opacity: 0, y: 28 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number], delay: 0.1 } },
                }}
                className="inline-block bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #B7FF72 0%, #7dff00 100%)" }}
              >
                Grow.
              </motion.span>
            </motion.h1>

            {/* Description */}
            <motion.p variants={fadeUp} className="mb-10 max-w-[480px] text-base leading-relaxed text-white/55 lg:text-lg">
              FreakingBall helps you manage your pickleball club with ease —
              organize open play, run tournaments, track players and stats,
              and build a thriving community.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
              <motion.button
                onClick={() => setAuthModal("register")}
                whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                className="group inline-flex items-center gap-2 rounded-full bg-brand-lime px-7 py-3.5 text-sm font-bold text-[#0d1810] shadow-[0_0_30px_rgba(183,255,114,0.25)] transition-shadow hover:shadow-[0_0_45px_rgba(183,255,114,0.45)]">
                Request a Demo
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </motion.button>
              <motion.button
                onClick={() => setAuthModal("login")}
                whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2.5 rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-white/80 transition-all hover:border-white/30 hover:bg-white/5 hover:text-white">
                Sign In to Your Club
              </motion.button>
            </motion.div>
          </motion.div>

          {/* RIGHT — dashboard mockup */}
          <motion.div
            className="relative flex items-center justify-center px-8 lg:px-0"
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          >
            <div className="absolute inset-0 rounded-3xl bg-brand-lime/5 blur-2xl" />

            {/* Main dashboard card */}
            <motion.div
              className="relative w-full max-w-[480px] overflow-hidden rounded-2xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
              style={{ background: "linear-gradient(145deg, #152019 0%, #0d1810 100%)" }}
              whileHover={{ y: -4, boxShadow: "0 40px_100px_rgba(0,0,0,0.7)" }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {/* Titlebar */}
              <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-3.5">
                <div className="flex gap-1.5">
                  {["bg-red-500/70", "bg-yellow-500/70", "bg-brand-lime/70"].map((c) => (
                    <div key={c} className={`h-3 w-3 rounded-full ${c}`} />
                  ))}
                </div>
                <div className="mx-auto flex items-center gap-2">
                  <Image src="/logo.png" alt="FB" width={20} height={20} className="object-contain opacity-80" />
                  <span className="text-xs font-semibold text-white/50">FreakingBall Dashboard</span>
                </div>
              </div>

              <div className="p-5">
                {/* Welcome */}
                <motion.div
                  className="mb-5 flex items-center justify-between"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <div>
                    <p className="text-[11px] text-white/35">Welcome back 👋</p>
                    <p className="text-sm font-bold text-white">SwanDinks Club</p>
                  </div>
                  <span className="rounded-full border border-brand-lime/30 bg-brand-lime/10 px-3 py-1 text-[10px] font-bold text-brand-lime">
                    ● LIVE
                  </span>
                </motion.div>

                {/* Stat cards */}
                <motion.div
                  className="mb-5 grid grid-cols-3 gap-3"
                  initial="hidden" animate="show"
                  variants={staggerContainer(0.65)}
                >
                  {dashboardStats.map((s) => (
                    <motion.div key={s.label} variants={fadeUp}
                      className="rounded-xl border border-white/[0.07] p-3 transition-all hover:border-brand-lime/20 hover:bg-brand-lime/[0.03]"
                      style={{ background: "rgba(255,255,255,0.03)" }}
                      whileHover={{ scale: 1.03 }}
                    >
                      <div className="mb-1.5 text-lg">{s.icon}</div>
                      <div className="text-xl font-black text-white">{s.value}</div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-white/35">{s.label}</div>
                      <div className="mt-1 text-[9px] text-brand-lime/70">{s.trend}</div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Leaderboard */}
                <motion.div
                  className="mb-4 overflow-hidden rounded-xl border border-white/[0.07]"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85, duration: 0.45 }}
                >
                  <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
                    <span className="text-xs font-bold text-white/70">Player Standings</span>
                    <span className="text-[10px] font-semibold text-brand-lime">View All →</span>
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {leaderboard.map((p, i) => (
                      <motion.div key={p.rank}
                        className="flex items-center gap-3 px-4 py-2.5"
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + i * 0.07, duration: 0.3 }}
                      >
                        <span className="w-4 text-[10px] font-bold text-white/25">{p.rank}</span>
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-lime/15 text-[10px] font-bold text-brand-lime">
                          {p.name.charAt(0)}
                        </div>
                        <span className="flex-1 text-xs font-semibold text-white/80">{p.name}</span>
                        <span className="text-[10px] font-bold text-brand-lime">{p.wins}W</span>
                        <span className="text-[10px] text-white/30">{p.losses}L</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Bar chart */}
                <motion.div
                  className="rounded-xl border border-white/[0.07] p-3"
                  style={{ background: "rgba(255,255,255,0.02)" }}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1, duration: 0.4 }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Weekly Activity</span>
                    <div className="flex items-center gap-1 text-[9px] text-brand-lime">
                      <TrendingUp className="h-3 w-3" />
                      +24% vs last week
                    </div>
                  </div>
                  <div className="flex h-14 items-end gap-1">
                    {chartBars.map((h, i) => (
                      <motion.div key={i}
                        className="flex-1 rounded-sm"
                        initial={{ scaleY: 0, originY: 1 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 1.15 + i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                        style={{
                          height: `${h}%`,
                          transformOrigin: "bottom",
                          background: i === 9 ? "#B7FF72" : `rgba(183,255,114,${0.2 + i * 0.03})`,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Floating accent cards — desktop only */}
            <motion.div
              className="absolute -right-4 top-10 hidden rounded-xl border border-white/10 bg-[#152019] px-4 py-3 shadow-xl animate-float-slow xl:block"
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-lime/20">
                  <Zap className="h-3.5 w-3.5 text-brand-lime" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white">Match Started</p>
                  <p className="text-[9px] text-white/40">Court 2 · Now</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute -left-4 bottom-16 hidden rounded-xl border border-white/10 bg-[#152019] px-4 py-3 shadow-xl animate-float-slow-reverse xl:block"
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 1.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500/20">
                  <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white">Tournament Live</p>
                  <p className="text-[9px] text-white/40">32 players · 4 courts</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{ background: "linear-gradient(to bottom, transparent, #0d1810)" }} />
      </section>

      {/* ── FEATURES ── */}
      <section className="relative py-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand-lime/20 to-transparent" />
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <Reveal className="mb-14 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-lime/80">
              Powerful Features
            </p>
            <h2 className="text-3xl font-black tracking-tight text-white lg:text-4xl">
              Everything You Need to Run<br className="hidden sm:block" /> Your Pickleball Club
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {features.map(({ icon: Icon, title, desc, color, iconColor, border }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <motion.div
                  className={`group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] p-5 ${border} transition-colors duration-300`}
                  style={{ background: "rgba(255,255,255,0.025)" }}
                  whileHover={{ y: -6, boxShadow: "0 24px 48px rgba(0,0,0,0.45)" }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                  <div className="relative">
                    <motion.div
                      className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/5"
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                      <Icon className={`h-5 w-5 ${iconColor}`} />
                    </motion.div>
                    <h3 className="mb-2 text-sm font-bold text-white">{title}</h3>
                    <p className="text-xs leading-relaxed text-white/45">{desc}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="relative py-8">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.07]"
              style={{ background: "linear-gradient(135deg, rgba(183,255,114,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}>
              <div className="absolute inset-0 opacity-[0.015]"
                style={{
                  backgroundImage: "linear-gradient(rgba(183,255,114,1) 1px, transparent 1px), linear-gradient(90deg, rgba(183,255,114,1) 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }} />
              <div className="relative grid grid-cols-2 divide-x divide-y divide-white/[0.06] md:grid-cols-4 md:divide-y-0">
                {statsData.map(({ icon: Icon, value, num, label }, i) => (
                  <Reveal key={label} delay={i * 0.1}>
                    <div className="flex flex-col items-center gap-2 px-4 py-8">
                      <motion.div
                        whileInView={{ scale: [0.7, 1.15, 1] }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <Icon className="h-6 w-6 text-brand-lime/60" />
                      </motion.div>
                      <span className="text-3xl font-black text-white">
                        {num ? <CountUp to={num} suffix={value.replace(/[\d,]/g, "")} /> : value}
                      </span>
                      <span className="text-xs font-medium text-white/40">{label}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Reveal>
            <motion.div
              className="relative overflow-hidden rounded-3xl border border-brand-lime/15 p-12 lg:p-16"
              style={{ background: "linear-gradient(135deg, rgba(183,255,114,0.08) 0%, rgba(13,24,16,0) 60%)" }}
              whileHover={{ boxShadow: "0 0 60px rgba(183,255,114,0.08)" }}
              transition={{ duration: 0.4 }}
            >
              <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-brand-lime/10 blur-3xl" />
              <div className="relative">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-lime/70">Get Started Today</p>
                <h2 className="mb-5 text-3xl font-black text-white lg:text-4xl">
                  Ready to Elevate<br />Your Pickleball Club?
                </h2>
                <p className="mx-auto mb-10 max-w-lg text-base text-white/50">
                  Join clubs already using FreakingBall to organize sessions, run tournaments,
                  and build thriving pickleball communities.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <motion.button whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setAuthModal("register")}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-lime px-8 py-4 text-sm font-bold text-[#0d1810] shadow-[0_0_30px_rgba(183,255,114,0.25)] transition-shadow hover:shadow-[0_0_50px_rgba(183,255,114,0.4)]">
                    Request a Demo →
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setAuthModal("login")}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-8 py-4 text-sm font-semibold text-white/70 transition hover:border-white/30 hover:text-white">
                    Sign In
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <Reveal>
        <footer className="border-t border-white/[0.06] py-10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <Image src="/freakingball.png" alt="FreakingBall" width={110} height={37} className="object-contain opacity-50" />
              <div className="flex gap-6">
                <button onClick={() => setModal("privacy")}
                  className="text-xs text-white/25 transition hover:text-white/50">
                  Privacy Policy
                </button>
                <button onClick={() => setModal("terms")}
                  className="text-xs text-white/25 transition hover:text-white/50">
                  Terms of Service
                </button>
              </div>
              <p className="text-xs text-white/20">
                © {new Date().getFullYear()} FreakingBall. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </Reveal>

      {modal && <LegalModal type={modal} onClose={() => setModal(null)} />}

      <AnimatePresence>
        {authModal && (
          <AuthModal
            key={authModal}
            initialMode={authModal}
            onClose={() => setAuthModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
