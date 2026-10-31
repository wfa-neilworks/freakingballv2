"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  { href: "/club",             label: "Dashboard",   icon: LayoutDashboard },
  { href: "/club/members",     label: "Members",      icon: Users },
  { href: "/club/open-play",   label: "Open Play",    icon: PlayCircle },
  { href: "/club/tournaments", label: "Tournaments",  icon: Trophy },
  { href: "/club/stats",       label: "Player Stats", icon: BarChart3 },
  { href: "/club/admin",       label: "Admin Section", icon: Settings },
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

export function ClubSidebar({ user, clubName, logoUrl }: ClubSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"privacy" | "terms" | null>(null);

  useEffect(() => { setOpen(false); }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const SIDEBAR_BG = "#0d1810";
  const CONTENT_BG = "#18251D";

  const NavItems = () => (
    <>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/club" && pathname.startsWith(href));

        if (active) {
          return (
            <div key={href} className="relative" style={{ marginRight: 0 }}>
              <div className="absolute right-0 h-5 w-5" style={{ top: "-20px", backgroundColor: CONTENT_BG }} />
              <div className="absolute right-0 h-5 w-5 rounded-br-[20px]" style={{ top: "-20px", backgroundColor: SIDEBAR_BG }} />
              <div className="absolute right-0 h-5 w-5" style={{ bottom: "-20px", backgroundColor: CONTENT_BG }} />
              <div className="absolute right-0 h-5 w-5 rounded-tr-[20px]" style={{ bottom: "-20px", backgroundColor: SIDEBAR_BG }} />
              <div
                className="flex items-center gap-3 rounded-l-[20px] py-3 pl-4"
                style={{ backgroundColor: CONTENT_BG, paddingRight: "24px" }}
              >
                <Icon className="h-5 w-5 shrink-0 text-brand-lime" />
                <span className="text-sm font-semibold text-white">{label}</span>
              </div>
            </div>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/45 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Icon className="h-5 w-5 shrink-0 transition-colors group-hover:text-white/80" />
            <span>{label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 px-4 lg:hidden"
        style={{ backgroundColor: SIDEBAR_BG }}
      >
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <ClubLogo logoUrl={logoUrl} clubName={clubName} size="sm" />
          <p className="truncate text-sm font-black text-white">{clubName}</p>
        </div>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-200 lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: SIDEBAR_BG }}
      >
        <div className="flex h-14 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <ClubLogo logoUrl={logoUrl} clubName={clubName} size="sm" />
            <p className="truncate text-sm font-black text-white">{clubName}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/club" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                  active
                    ? "bg-brand-lime/15 font-semibold text-brand-lime"
                    : "text-white/45 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-6">
          <div className="mb-1 rounded-xl px-4 py-2">
            <p className="truncate text-xs font-semibold text-white/70">{user.name ?? "Club Admin"}</p>
            <p className="truncate text-[10px] text-white/30">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-white/35 transition-colors hover:bg-white/5 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
          <div className="mt-2 flex gap-3 px-4">
            <button onClick={() => setModal("privacy")} className="text-[10px] text-white/20 hover:text-white/50">Privacy</button>
            <button onClick={() => setModal("terms")} className="text-[10px] text-white/20 hover:text-white/50">Terms</button>
          </div>
        </div>
      </div>

      {/* ── Desktop sidebar ── */}
      <aside
        className="relative hidden w-60 shrink-0 flex-col lg:flex"
        style={{ backgroundColor: SIDEBAR_BG }}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-5">
          <ClubLogo logoUrl={logoUrl} clubName={clubName} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{clubName}</p>
            <p className="truncate text-[10px] text-white/35">Club Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 py-4" style={{ paddingLeft: "12px" }}>
          <NavItems />
        </nav>

        {/* User + sign out */}
        <div className="px-3 pb-5">
          <div className="mb-1 rounded-xl px-4 py-2">
            <p className="truncate text-xs font-semibold text-white/70">{user.name ?? "Club Admin"}</p>
            <p className="truncate text-[10px] text-white/30">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-white/35 transition-colors hover:bg-white/5 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
          <div className="mt-2 flex gap-3 px-4">
            <button onClick={() => setModal("privacy")} className="text-[10px] text-white/20 hover:text-white/50">Privacy</button>
            <button onClick={() => setModal("terms")} className="text-[10px] text-white/20 hover:text-white/50">Terms</button>
          </div>
        </div>
      </aside>
      {modal && <LegalModal type={modal} onClose={() => setModal(null)} />}
    </>
  );
}
