export const revalidate = 30;
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, UserRound, User } from "lucide-react";
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
          <h1 className="text-2xl font-black text-white">
            {isGuests ? "Guests" : "Members"}
          </h1>
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

      {/* Tabs + Search row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1 w-fit">
          {[
            { label: "Members", tab: undefined },
            { label: "Guests",  tab: "guests" },
          ].map((t) => (
            <Link
              key={t.label}
              href={`/club/members${t.tab ? `?tab=${t.tab}` : ""}`}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                (!t.tab && !isGuests) || (t.tab === tab)
                  ? "bg-brand-lime text-brand-dark"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <form>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search by name…"
            className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-lime sm:w-64"
          />
          {tab && <input type="hidden" name="tab" value={tab} />}
        </form>
      </div>

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
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-lime/10">
                {m.gender === "male"
                  ? <UserRound className="h-4 w-4 text-blue-400" />
                  : <User className="h-4 w-4 text-pink-400" />}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-white">{m.full_name}</p>
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

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                <Link href={`/club/members/${m.id}/edit`}>
                  <Button size="sm" variant="ghost">Edit</Button>
                </Link>
                <DeleteMemberButton memberId={m.id} memberName={m.full_name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
