export const runtime = 'edge';
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Clock, CheckCircle, XCircle } from "lucide-react";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const { data: clubs } = await supabase
    .from("clubs")
    .select("status");

  const pending = clubs?.filter((c) => c.status === "pending").length ?? 0;
  const approved = clubs?.filter((c) => c.status === "approved").length ?? 0;
  const rejected = clubs?.filter((c) => c.status === "rejected").length ?? 0;
  const total = clubs?.length ?? 0;

  const stats = [
    { label: "Total Clubs", value: total, icon: Building2, color: "text-white" },
    { label: "Pending Review", value: pending, icon: Clock, color: "text-yellow-400" },
    { label: "Approved", value: approved, icon: CheckCircle, color: "text-brand-lime" },
    { label: "Rejected", value: rejected, icon: XCircle, color: "text-red-400" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-white/50">FreakingBall platform status</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/50">{label}</p>
                <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
              </div>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
          </Card>
        ))}
      </div>

      {pending > 0 && (
        <div className="mt-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-400">
            <span className="font-semibold">{pending} club application{pending > 1 ? "s" : ""}</span>{" "}
            waiting for your review.{" "}
            <a href="/admin/clubs" className="underline">
              Review now →
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
