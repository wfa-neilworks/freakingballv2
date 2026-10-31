export const runtime = 'edge';
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { SessionStatus } from "@/types/database";

export default async function OpenPlayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .eq("admin_id", user!.id)
    .single();

  const { data: sessions } = await supabase
    .from("open_plays")
    .select("id, name, play_type, doubles_category, date_time, location, num_courts, status")
    .eq("club_id", club!.id)
    .order("date_time", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Open Play</h1>
          <p className="text-sm text-white/50">Manage play sessions</p>
        </div>
        <Link href="/club/open-play/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {!sessions?.length && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center text-white/40">
            No open play sessions yet.
          </div>
        )}
        {sessions?.map((s) => (
          <Link key={s.id} href={`/club/open-play/${s.id}`}>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-brand-lime/20 hover:bg-white/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{s.name}</h3>
                    <Badge variant={s.status as SessionStatus}>{s.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-white/50 capitalize">
                    {s.play_type.replace(/_/g, " ")}
                    {s.doubles_category ? ` · ${s.doubles_category}` : ""}
                    {" · "}
                    {s.num_courts} court{s.num_courts > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {new Date(s.date_time).toLocaleString("en-PH", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {s.location}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
