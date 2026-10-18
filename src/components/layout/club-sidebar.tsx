"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  PlayCircle,
  Trophy,
  BarChart3,
  LogOut,
  ChevronRight,
} from "lucide-react";

const nav = [
  { href: "/club", label: "Dashboard", icon: LayoutDashboard },
  { href: "/club/members", label: "Members & Guests", icon: Users },
  { href: "/club/open-play", label: "Open Play", icon: PlayCircle },
  { href: "/club/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/club/stats", label: "Player Stats", icon: BarChart3 },
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

  return (
    <aside className="flex w-64 flex-col border-r border-white/10 bg-black/20">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-lime">
          <span className="text-sm font-black text-brand-dark">F</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">FreakingBall</p>
          <p className="truncate text-[10px] text-brand-lime">{clubName}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/club" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-brand-lime/15 text-brand-lime"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3 w-3" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-3 py-2">
          <p className="truncate text-sm font-medium text-white">
            {user.name ?? "Club Admin"}
          </p>
          <p className="truncate text-xs text-white/40">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
