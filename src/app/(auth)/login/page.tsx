"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LegalModal } from "@/components/legal-modal";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<"privacy" | "terms" | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Check if club admin's club is approved
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role === "club_admin") {
        const { data: club } = await supabase
          .from("clubs")
          .select("status")
          .eq("admin_id", data.user.id)
          .single();

        if (!club || club.status === "pending") {
          await supabase.auth.signOut();
          setError(
            "Your application is still pending review. You will be notified once approved."
          );
          setLoading(false);
          return;
        }
        if (club.status === "rejected") {
          await supabase.auth.signOut();
          setError("Your club application was rejected. Please contact support.");
          setLoading(false);
          return;
        }
      }

      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <Image src="/freakingball.png" alt="FreakingBall" width={280} height={160} className="mx-auto object-contain" />
          <p className="mt-1 text-sm text-white/50">
            Pickleball Club Management
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="admin@club.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Want to use FreakingBall for your club?{" "}
          <Link href="/register" className="text-brand-lime hover:underline">
            Register your club
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-white/25">
          <button onClick={() => setModal("privacy")} className="hover:text-white/50">Privacy Policy</button>
          {" · "}
          <button onClick={() => setModal("terms")} className="hover:text-white/50">Terms of Service</button>
        </p>
      </div>
      {modal && <LegalModal type={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
