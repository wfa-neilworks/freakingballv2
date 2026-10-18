"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-lime">
            <span className="text-2xl font-black text-brand-dark">F</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            FreakingBall
          </h1>
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
      </div>
    </div>
  );
}
