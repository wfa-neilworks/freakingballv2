import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Users, PlayCircle, Trophy, BarChart3 } from "lucide-react";
import Link from "next/link";

export default async function ClubDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_guest", false)
      .eq("is_active", true),
    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_guest", true),
    supabase
      .from("open_plays")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "active"),
    supabase
      .from("tournaments")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .neq("status", "completed"),
  ]);

  const quickStats = [
    {
      label: "Members",
      value: memberCount ?? 0,
      icon: Users,
      href: "/club/members",
      color: "text-brand-lime",
    },
    {
      label: "Guests",
      value: guestCount ?? 0,
      icon: Users,
      href: "/club/members?tab=guests",
      color: "text-white/70",
    },
    {
      label: "Active Open Plays",
      value: openPlayCount ?? 0,
      icon: PlayCircle,
      href: "/club/open-play",
      color: "text-blue-400",
    },
    {
      label: "Active Tournaments",
      value: tournamentCount ?? 0,
      icon: Trophy,
      href: "/club/tournaments",
      color: "text-yellow-400",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{club!.name}</h1>
        <p className="text-sm text-white/50">Club overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {quickStats.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href}>
            <Card className="transition-colors hover:border-brand-lime/30 hover:bg-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-white/50">{label}</p>
                  <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
                </div>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/40">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/club/members/new", label: "Add Member", icon: Users },
            { href: "/club/open-play/new", label: "Start Open Play", icon: PlayCircle },
            { href: "/club/tournaments/new", label: "Create Tournament", icon: Trophy },
            { href: "/club/stats", label: "View Stats", icon: BarChart3 },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm font-medium text-white/70 transition-colors hover:border-brand-lime/30 hover:bg-brand-lime/5 hover:text-brand-lime"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
