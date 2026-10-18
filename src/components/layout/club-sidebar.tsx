"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  PlayCircle,
  Trophy,
  BarChart3,
  LogOut,
} from "lucide-react";

const nav = [
  { href: "/club",            label: "Dashboard",      icon: LayoutDashboard },
  { href: "/club/members",    label: "Members",         icon: Users },
  { href: "/club/open-play",  label: "Open Play",       icon: PlayCircle },
  { href: "/club/tournaments",label: "Tournaments",     icon: Trophy },
  { href: "/club/stats",      label: "Player Stats",    icon: BarChart3 },
];

interface ClubSidebarProps {
  user: { name: string | null; email: string };
  clubName: string;
}

export function ClubSidebar({ user, clubName }: ClubSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Sidebar bg and main content bg must be exact hex matches for the cutout to be seamless
  const SIDEBAR_BG = "#0d1810";   // darker green — sidebar background
  const CONTENT_BG = "#18251D";   // brand-dark — main content background (pill fill + cutout fill)

  return (
    <aside
      className="relative flex w-60 shrink-0 flex-col"
      style={{ backgroundColor: SIDEBAR_BG }}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-lime">
          <span className="text-sm font-black text-brand-dark">F</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">FreakingBall</p>
          <p className="truncate text-[10px] text-brand-lime/70">{clubName}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 py-4" style={{ paddingLeft: "12px" }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/club" && pathname.startsWith(href));

          if (active) {
            return (
              <div key={href} className="relative" style={{ marginRight: 0 }}>
                {/* Top corner: fill content-bg square, overlay sidebar-bg rounded corner */}
                <div
                  className="absolute right-0 h-5 w-5"
                  style={{ top: "-20px", backgroundColor: CONTENT_BG }}
                />
                <div
                  className="absolute right-0 h-5 w-5 rounded-br-[20px]"
                  style={{ top: "-20px", backgroundColor: SIDEBAR_BG }}
                />

                {/* Bottom corner */}
                <div
                  className="absolute right-0 h-5 w-5"
                  style={{ bottom: "-20px", backgroundColor: CONTENT_BG }}
                />
                <div
                  className="absolute right-0 h-5 w-5 rounded-tr-[20px]"
                  style={{ bottom: "-20px", backgroundColor: SIDEBAR_BG }}
                />

                {/* Active pill — bg matches main content exactly */}
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
      </nav>

      {/* User + sign out */}
      <div className="px-3 pb-5">
        <div className="mb-1 rounded-xl px-4 py-2">
          <p className="truncate text-xs font-semibold text-white/70">
            {user.name ?? "Club Admin"}
          </p>
          <p className="truncate text-[10px] text-white/30">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-white/35 transition-colors hover:bg-white/5 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
