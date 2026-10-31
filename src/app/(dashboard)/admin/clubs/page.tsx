import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ClubActions } from "@/components/admin/club-actions";
import type { ClubStatus } from "@/types/database";

export default async function AdminClubsPage() {
  const supabase = await createClient();

  const { data: clubs } = await supabase
    .from("clubs")
    .select(`
      id, name, location, contact_email, contact_phone,
      status, rejection_reason, created_at,
      profiles!clubs_admin_id_fkey(full_name, email)
    `)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Club Applications</h1>
        <p className="text-sm text-white/50">
          Approve or reject clubs that want to use FreakingBall
        </p>
      </div>

      <div className="space-y-3">
        {!clubs?.length && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-white/40">No club applications yet.</p>
          </div>
        )}

        {clubs?.map((club) => {
          const admin = Array.isArray(club.profiles)
            ? club.profiles[0]
            : club.profiles;

          return (
            <div
              key={club.id}
              className="rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white truncate">{club.name}</h3>
                    <Badge variant={club.status as ClubStatus}>{club.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-white/50">
                    {club.location ?? "No location provided"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/40">
                    <span>
                      Admin:{" "}
                      <span className="text-white/60">
                        {admin?.full_name ?? admin?.email ?? "—"}
                      </span>
                    </span>
                    <span>
                      Email:{" "}
                      <span className="text-white/60">{club.contact_email}</span>
                    </span>
                    {club.contact_phone && (
                      <span>
                        Phone:{" "}
                        <span className="text-white/60">{club.contact_phone}</span>
                      </span>
                    )}
                    <span>
                      Applied:{" "}
                      <span className="text-white/60">
                        {new Date(club.created_at).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </span>
                  </div>
                  {club.rejection_reason && (
                    <p className="mt-2 text-xs text-red-400">
                      Rejection reason: {club.rejection_reason}
                    </p>
                  )}
                </div>

                {club.status === "pending" && (
                  <ClubActions clubId={club.id} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
