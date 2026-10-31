"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LegalModal } from "@/components/legal-modal";

export default function RegisterPage() {
  const router = useRouter();
  const [modal, setModal] = useState<"privacy" | "terms" | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    clubName: "",
    clubLocation: "",
    contactPhone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { role: "club_admin", full_name: form.fullName },
      },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Registration failed.");
      setLoading(false);
      return;
    }

    // Use server API route (service role) to insert club — bypasses RLS and
    // email confirmation requirement
    const res = await fetch("/api/register-club", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: data.user.id,
        email: form.email,
        fullName: form.fullName,
        clubName: form.clubName,
        clubLocation: form.clubLocation,
        contactPhone: form.contactPhone,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      setError(result.error ?? "Failed to submit club application.");
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-lime/20">
            <span className="text-3xl">🎾</span>
          </div>
          <h2 className="text-xl font-bold text-white">Application Submitted!</h2>
          <p className="mt-2 text-sm text-white/50">
            Your club registration is pending review. We&apos;ll notify you once
            approved. This usually takes 1–2 business days.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => router.push("/login")}
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-lime">
            <span className="text-2xl font-black text-brand-dark">F</span>
          </div>
          <h1 className="text-2xl font-black text-white">Register Your Club</h1>
          <p className="mt-1 text-sm text-white/50">
            Applications are reviewed by our team
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-lime">
            Admin Account
          </p>
          <Input
            label="Full Name"
            placeholder="Juan dela Cruz"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="juan@club.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min 8 characters"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            required
          />

          <p className="pt-2 text-xs font-semibold uppercase tracking-widest text-brand-lime">
            Club Details
          </p>
          <Input
            label="Club Name"
            placeholder="Manila Picklers Club"
            value={form.clubName}
            onChange={(e) => update("clubName", e.target.value)}
            required
          />
          <Input
            label="Location"
            placeholder="Quezon City, Metro Manila"
            value={form.clubLocation}
            onChange={(e) => update("clubLocation", e.target.value)}
          />
          <Input
            label="Contact Phone (optional)"
            type="tel"
            placeholder="+63 9XX XXX XXXX"
            value={form.contactPhone}
            onChange={(e) => update("contactPhone", e.target.value)}
          />

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <p className="text-xs text-white/40 text-center">
            By submitting, you agree to our{" "}
            <button type="button" onClick={() => setModal("terms")} className="text-brand-lime hover:underline">Terms of Service</button>
            {" "}and{" "}
            <button type="button" onClick={() => setModal("privacy")} className="text-brand-lime hover:underline">Privacy Policy</button>
          </p>

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Submit Application
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Already registered?{" "}
          <a href="/login" className="text-brand-lime hover:underline">Sign in</a>
        </p>
      </div>
      {modal && <LegalModal type={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
