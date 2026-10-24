export const revalidate = 30;
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, UserRound, User, Trophy } from "lucide-react";
import Link from "next/link";
import { DeleteMemberButton } from "@/components/club/delete-member-button";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { tab, q } = await searchParams;
  const isGuests = tab === "guests";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs").select("id").eq("admin_id", user!.id).single();

  let query = supabase
    .from("members")
    .select("id, full_name, nickname, phone, gender, is_active, created_at")
    .eq("club_id", club!.id)
    .eq("is_guest", isGuests)
    .order("full_name");

  if (q) query = query.ilike("full_name", `%${q}%`);

  const { data: members } = await query;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-brand-lime" />
            <h1 className="text-2xl font-black text-white">
              {isGuests ? "Guests" : "Members"}
            </h1>
          </div>
          <p className="mt-0.5 text-sm text-white/40">
            {members?.length ?? 0} {isGuests ? "guest" : "member"}
            {(members?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href={`/club/members/new?type=${isGuests ? "guest" : "member"}`}>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add {isGuests ? "Guest" : "Member"}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-white/3">
        {[
          { label: "Members", icon: UserRound, tab: undefined },
          { label: "Guests",  icon: User,      tab: "guests" },
        ].map((t, i) => (
          <Link
            key={t.label}
            href={`/club/members${t.tab ? `?tab=${t.tab}` : ""}`}
            className={`flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all ${
              i !== 0 ? "border-l border-white/10" : ""
            } ${
              (!t.tab && !isGuests) || (t.tab === tab)
                ? "bg-brand-lime text-brand-dark"
                : "text-white/40 hover:bg-white/5 hover:text-white"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        ))}
      </div>

      {/* Search */}
      <form>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search by name, phone, or nickname..."
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-lime"
          />
        </div>
        {tab && <input type="hidden" name="tab" value={tab} />}
      </form>

      {/* Empty state */}
      {!members?.length && (
        <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-white/40">
          No {isGuests ? "guests" : "members"} yet.{" "}
          <Link
            href={`/club/members/new?type=${isGuests ? "guest" : "member"}`}
            className="text-brand-lime hover:underline"
          >
            Add one
          </Link>
        </div>
      )}

      {/* Desktop table */}
      {!!members?.length && (
        <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Nickname</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Gender</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/40">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-lime/10">
                        {m.gender === "male"
                          ? <UserRound className="h-3.5 w-3.5 text-blue-400" />
                          : <User className="h-3.5 w-3.5 text-pink-400" />}
                      </div>
                      <span className="font-medium text-white">{m.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/50">{m.nickname ?? "—"}</td>
                  <td className="px-4 py-3 text-white/50 capitalize">{m.gender}</td>
                  <td className="px-4 py-3 text-white/50">{m.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.is_active ? "approved" : "cancelled"}>
                      {m.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/club/members/${m.id}/edit`}>
                        <Button size="sm" variant="ghost">Edit</Button>
                      </Link>
                      <DeleteMemberButton memberId={m.id} memberName={m.full_name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile card list */}
      {!!members?.length && (
        <div className="space-y-2 md:hidden">
          {members.map((m) => {
            const initials = m.full_name.trim().split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
            const avatarBg = m.gender === "male" ? "bg-blue-500/20" : "bg-pink-500/20";
            const avatarText = m.gender === "male" ? "text-blue-300" : "text-pink-300";
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${avatarBg}`}>
                  <span className={`text-sm font-black ${avatarText}`}>{initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{m.full_name}</p>
                    <Badge variant={m.is_active ? "approved" : "cancelled"}>
                      {m.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/35">
                    {m.nickname ? `"${m.nickname}" · ` : ""}
                    <span className="capitalize">{m.gender}</span>
                    {m.phone ? ` · ${m.phone}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link href={`/club/members/${m.id}/edit`}>
                    <Button size="sm" variant="ghost">Edit</Button>
                  </Link>
                  <DeleteMemberButton memberId={m.id} memberName={m.full_name} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
