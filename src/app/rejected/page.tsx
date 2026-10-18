import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function RejectedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: club } = await supabase
    .from("clubs")
    .select("name, rejection_reason, status")
    .eq("admin_id", user.id)
    .single();

  if (club?.status === "approved") redirect("/club");

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="max-w-sm text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
          <span className="text-3xl">❌</span>
        </div>
        <h2 className="text-xl font-bold text-white">Application Rejected</h2>
        <p className="mt-2 text-sm text-white/50">
          Your application for <strong className="text-white">{club?.name}</strong> was
          not approved.
        </p>
        {club?.rejection_reason && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 text-left">
            <strong>Reason:</strong> {club.rejection_reason}
          </div>
        )}
        <p className="mt-4 text-xs text-white/30">
          For questions, contact support.
        </p>
        <Link href="/login" className="mt-6 inline-block">
          <Button variant="ghost" size="sm">
            Sign Out & Go Back
          </Button>
        </Link>
      </div>
    </div>
  );
}
