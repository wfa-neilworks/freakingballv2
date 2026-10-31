export const runtime = 'edge';
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: club } = await supabase
    .from("clubs")
    .select("name, status")
    .eq("admin_id", user.id)
    .single();

  if (club?.status === "approved") redirect("/club");
  if (club?.status === "rejected") redirect("/rejected");

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="max-w-sm text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/20">
          <span className="text-3xl">⏳</span>
        </div>
        <h2 className="text-xl font-bold text-white">Application Pending</h2>
        <p className="mt-2 text-sm text-white/50">
          Your application for <strong className="text-white">{club?.name}</strong> is
          still under review. You&apos;ll receive access once approved by our team.
        </p>
        <p className="mt-4 text-xs text-white/30">
          This usually takes 1–2 business days.
        </p>
        <form action="/api/auth/signout" method="post" className="mt-6">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign Out
            </Button>
          </Link>
        </form>
      </div>
    </div>
  );
}
