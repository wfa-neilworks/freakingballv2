export const revalidate = 30;
import { createClient } from "@/lib/supabase/server";
import { Users, PlayCircle, Trophy, BarChart3, UserPlus, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function ClubDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, name")
    .eq("admin_id", user!.id)
    .single();

  const clubId = club!.id;

  const [
    { count: memberCount },
    { count: guestCount },
    { count: openPlayCount },
    { count: tournamentCount },
  ] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }).eq("club_id", clubId).eq("is_guest", false).eq("is_active", true),
    supabase.from("members").select("*", { count: "exact", head: true }).eq("club_id", clubId).eq("is_guest", true),
    supabase.from("open_plays").select("*", { count: "exact", head: true }).eq("club_id", clubId).eq("status", "active"),
    supabase.from("tournaments").select("*", { count: "exact", head: true }).eq("club_id", clubId).neq("status", "completed"),
  ]);

  const stats = [
    { label: "Members",           value: memberCount ?? 0,   icon: Users,      href: "/club/members",           iconBg: "bg-brand-lime/15",  iconColor: "text-brand-lime",   valueColor: "text-brand-lime",   emptyLabel: null },
    { label: "Guests",            value: guestCount ?? 0,    icon: Users,      href: "/club/members?tab=guests", iconBg: "bg-white/8",         iconColor: "text-white/50",     valueColor: "text-white/70",     emptyLabel: null },
    { label: "Active Open Plays", value: openPlayCount ?? 0, icon: PlayCircle, href: "/club/open-play",          iconBg: "bg-blue-500/15",    iconColor: "text-blue-400",     valueColor: "text-blue-400",     emptyLabel: "No active plays right now" },
    { label: "Active Tournaments",value: tournamentCount ?? 0,icon: Trophy,    href: "/club/tournaments",        iconBg: "bg-yellow-500/15",  iconColor: "text-yellow-400",   valueColor: "text-yellow-400",   emptyLabel: "No active tournaments right now" },
  ];

  const actions = [
    { href: "/club/members/new",     label: "Add Member",        desc: "Invite a new member to your club",          icon: UserPlus,   iconBg: "bg-brand-lime/15",  iconColor: "text-brand-lime" },
    { href: "/club/open-play/new",   label: "Start Open Play",   desc: "Create a new open play session",            icon: PlayCircle, iconBg: "bg-blue-500/15",    iconColor: "text-blue-400" },
    { href: "/club/tournaments/new", label: "Create Tournament", desc: "Set up a new tournament",                   icon: Trophy,     iconBg: "bg-yellow-500/15",  iconColor: "text-yellow-400" },
    { href: "/club/stats",           label: "View Stats",        desc: "Track your club's activity and performance", icon: BarChart3,  iconBg: "bg-brand-lime/15",  iconColor: "text-brand-lime" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">{club!.name}</h1>
        <p className="mt-0.5 text-sm text-white/40">Club overview</p>
      </div>

      {/* Stat tiles — 2×2 grid, each a solid card */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, href, iconBg, iconColor, valueColor, emptyLabel }) => (
          <Link
            key={label}
            href={href}
            className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/4 p-4 transition-all hover:border-brand-lime/25 hover:bg-white/6"
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <ChevronRight className="h-4 w-4 text-white/20 transition-colors group-hover:text-white/40" />
            </div>
            <div className="mt-3">
              <p className="text-sm font-medium text-white/50">{label}</p>
              <p className={`mt-0.5 text-4xl font-black leading-none ${valueColor}`}>{value}</p>
              {emptyLabel && value === 0 && (
                <p className="mt-1.5 text-[11px] text-white/25">{emptyLabel}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-brand-lime" />
          <h2 className="text-base font-black text-white">Quick Actions</h2>
        </div>
        <div className="space-y-2">
          {actions.map(({ href, label, desc, icon: Icon, iconBg, iconColor }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/4 px-4 py-4 transition-all hover:border-brand-lime/25 hover:bg-white/6"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{label}</p>
                <p className="text-xs text-white/35">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
