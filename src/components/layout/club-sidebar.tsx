"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { LegalModal } from "@/components/legal-modal";
import {
  LayoutDashboard,
  Users,
  PlayCircle,
  Trophy,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const nav = [
  { href: "/club",             label: "Dashboard",    icon: LayoutDashboard },
  { href: "/club/members",     label: "Members",      icon: Users },
  { href: "/club/open-play",   label: "Open Play",    icon: PlayCircle },
  { href: "/club/tournaments", label: "Tournaments",  icon: Trophy },
  { href: "/club/stats",       label: "Player Stats", icon: BarChart3 },
  { href: "/club/admin",       label: "Admin",        icon: Settings },
];

interface ClubSidebarProps {
  user: { name: string | null; email: string };
  clubName: string;
  logoUrl: string | null;
}

function ClubLogo({ logoUrl, clubName, size }: { logoUrl: string | null; clubName: string; size: "sm" | "md" }) {
  const dim = size === "md" ? "h-9 w-9" : "h-8 w-8";
  const initials = clubName.trim().slice(0, 2).toUpperCase();
  if (logoUrl) {
    return (
      <div className={`relative ${dim} shrink-0 overflow-hidden rounded-xl`}>
        <Image src={logoUrl} alt={clubName} fill className="object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div className={`flex ${dim} shrink-0 items-center justify-center rounded-xl bg-brand-lime`}>
      <span className={`font-black text-brand-dark ${size === "md" ? "text-sm" : "text-xs"}`}>{initials}</span>
    </div>
  );
}

function UserAvatar({ name }: { name: string | null }) {
  const initials = (name ?? "CA").trim().slice(0, 2).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-lime/15 text-xs font-black text-brand-lime ring-1 ring-brand-lime/20">
      {initials}
    </div>
  );
}

function NavItem({ href, label, icon: Icon, animate, delay = 0 }: {
  href: string; label: string; icon: React.ElementType; animate?: boolean; delay?: number;
}) {
  const pathname = usePathname();
  const active = href === "/club"
    ? pathname === "/club"
    : pathname.startsWith(href);

  const item = (
    <Link
      href={href}
      className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150"
      style={{
        background: active ? "rgba(183,255,114,0.08)" : "transparent",
        color: active ? "#b7ff72" : "rgba(255,255,255,0.40)",
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
        if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
        if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.40)";
      }}
    >
      {/* Left edge indicator */}
      <span
        className="absolute inset-y-2 left-0 w-[3px] rounded-r-full transition-all duration-150"
        style={{
          background: active ? "#b7ff72" : "transparent",
          opacity: active ? 1 : 0,
        }}
      />

      {/* Icon container */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150"
        style={{
          background: active ? "rgba(183,255,114,0.15)" : "transparent",
        }}
      >
        <Icon
          className="h-[17px] w-[17px] transition-all duration-150"
          style={{ color: active ? "#b7ff72" : "inherit" }}
        />
      </div>

      <span className="flex-1 truncate leading-none">{label}</span>
    </Link>
  );

  if (!animate) return item;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.2 }}
    >
      {item}
    </motion.div>
  );
}

const SidebarContent = ({
  animate = false,
  user,
  clubName,
  logoUrl,
  onSignOut,
  signingOut,
  onModal,
}: {
  animate?: boolean;
  user: ClubSidebarProps["user"];
  clubName: string;
  logoUrl: string | null;
  onSignOut: () => void;
  signingOut: boolean;
  onModal: (t: "privacy" | "terms") => void;
}) => (
  <div className="flex h-full flex-col">

    {/* ── Brand header ──────────────────────────────── */}
    <div
      className="flex h-16 shrink-0 items-center gap-3 border-b px-4"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="relative">
        <ClubLogo logoUrl={logoUrl} clubName={clubName} size="md" />
        <span
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2"
          style={{ background: "#b7ff72", borderColor: "#0d1810" }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black leading-tight text-white">{clubName}</p>
        <p className="mt-0.5 truncate text-[10px] font-medium text-white/28">Club Dashboard</p>
      </div>
    </div>

    {/* ── Navigation ────────────────────────────────── */}
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <p className="mb-2.5 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/18">
        Navigation
      </p>
      <div className="space-y-0.5">
        {nav.map(({ href, label, icon }, i) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            animate={animate}
            delay={0.05 + i * 0.04}
          />
        ))}
      </div>
    </nav>

    {/* ── User footer ───────────────────────────────── */}
    <div
      className="shrink-0 border-t px-3 pb-4 pt-3"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      {/* User card */}
      <div
        className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <UserAvatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-white/85">
            {user.name ?? "Club Admin"}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-white/28">{user.email}</p>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={onSignOut}
        disabled={signingOut}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-150 disabled:opacity-50"
        style={{ color: "rgba(255,255,255,0.28)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.08)";
          (e.currentTarget as HTMLElement).style.color = "#f87171";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)";
        }}
      >
        <LogOut className={`h-4 w-4 shrink-0 ${signingOut ? "animate-spin" : ""}`} />
        <span className="text-xs font-medium">{signingOut ? "Signing out…" : "Sign Out"}</span>
      </button>

      {/* Legal */}
      <div className="mt-2 flex gap-3 px-3">
        <button
          onClick={() => onModal("privacy")}
          className="text-[10px] text-white/15 transition-colors hover:text-white/40"
        >
          Privacy
        </button>
        <span className="text-[10px] text-white/10">·</span>
        <button
          onClick={() => onModal("terms")}
          className="text-[10px] text-white/15 transition-colors hover:text-white/40"
        >
          Terms
        </button>
      </div>
    </div>
  </div>
);

export function ClubSidebar({ user, clubName, logoUrl }: ClubSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"privacy" | "terms" | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const sharedProps = {
    user,
    clubName,
    logoUrl,
    onSignOut: handleSignOut,
    signingOut,
    onModal: (t: "privacy" | "terms") => setModal(t),
  };

  return (
    <>
      {/* ── Mobile top bar ──────────────────────────── */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b px-4 lg:hidden"
        style={{ backgroundColor: "#0d1810", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/8 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <ClubLogo logoUrl={logoUrl} clubName={clubName} size="sm" />
          <p className="truncate text-sm font-black text-white">{clubName}</p>
        </div>
      </div>

      {/* ── Mobile overlay ──────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile drawer ───────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
            style={{ backgroundColor: "#0d1810" }}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent animate {...sharedProps} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop fixed sidebar ───────────────────── */}
      <motion.aside
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r lg:flex"
        style={{ backgroundColor: "#0d1810", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <SidebarContent {...sharedProps} />
      </motion.aside>

      {modal && <LegalModal type={modal} onClose={() => setModal(null)} />}
    </>
  );
}
