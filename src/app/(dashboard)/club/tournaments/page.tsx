export const revalidate = 30;
import { createClient } from "@/lib/supabase/server";
import { Plus, Trophy, ChevronRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import type { TournamentStatus } from "@/types/database";

const STATUS_STYLE: Record<TournamentStatus, { label: string; pill: string }> = {
  draft:        { label: "Draft",        pill: "bg-white/8 text-white/40" },
  registration: { label: "Registration", pill: "bg-blue-500/15 text-blue-300" },
  active:       { label: "Active",       pill: "bg-brand-lime/15 text-brand-lime" },
  completed:    { label: "Completed",    pill: "bg-white/6 text-white/30" },
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs").select("id").eq("admin_id", user!.id).single();

  let query = supabase
    .from("tournaments")
    .select("id, name, status, created_at, tournament_events(id)")
    .eq("club_id", club!.id)
    .order("created_at", { ascending: false });

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: tournaments } = await query;

  const total = tournaments?.length ?? 0;
  const active = tournaments?.filter((t) => t.status === "active").length ?? 0;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-brand-lime" />
            <h1 className="text-2xl font-black text-white">Tournaments</h1>
          </div>
          <p className="mt-0.5 text-sm text-white/40">
            {total} total{active > 0 ? ` · ${active} active` : ""}
          </p>
        </div>
        <Link
          href="/club/tournaments/new"
          className="flex items-center gap-2 rounded-2xl bg-brand-lime px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-lime/90"
        >
          <Plus className="h-4 w-4" />
          New Tournament
        </Link>
      </div>

      {/* Search */}
      <form>
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search tournaments..."
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-lime"
          />
        </div>
      </form>

      {/* Empty state */}
      {!total && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-lime/10">
            <Trophy className="h-7 w-7 text-brand-lime/60" />
          </div>
          <p className="font-semibold text-white/50">{q ? "No tournaments found" : "No tournaments yet"}</p>
          <p className="mt-1 text-sm text-white/25">{q ? "Try a different search term" : "Run your first tournament for your club"}</p>
          {!q && (
            <Link href="/club/tournaments/new" className="mt-6 flex items-center gap-2 rounded-2xl bg-brand-lime px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-lime/90">
              <Plus className="h-4 w-4" />
              Create Tournament
            </Link>
          )}
        </div>
      )}

      {/* Tournament list */}
      {total > 0 && (
        <div className="space-y-2">
          {tournaments!.map((t) => {
            const eventCount = Array.isArray(t.tournament_events) ? t.tournament_events.length : 0;
            const style = STATUS_STYLE[t.status as TournamentStatus] ?? STATUS_STYLE.draft;
            return (
              <Link key={t.id} href={`/club/tournaments/${t.id}`} className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-white/3 px-4 py-4 transition-all hover:border-brand-lime/20 hover:bg-white/5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-lime/10">
                  <CalendarDays className="h-5 w-5 text-brand-lime/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white group-hover:text-brand-lime transition-colors">
                    {t.name}
                  </p>
                  <p className="text-xs text-white/35">
                    {eventCount} event{eventCount !== 1 ? "s" : ""} · {new Date(t.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.pill}`}>
                  {style.label}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/20 transition-colors group-hover:text-white/50" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
