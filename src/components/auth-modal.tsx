"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LegalModal } from "@/components/legal-modal";

type Mode = "login" | "register";

interface AuthModalProps {
  initialMode?: Mode;
  onClose: () => void;
}

// ── Shared animation variants ────────────────────────────────────────────────

const backdropVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.25 } },
  exit:   { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  show:   { opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit:   { opacity: 0, scale: 0.97, y: 8,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const formVariants = {
  hidden: { opacity: 0, x: 12 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit:   { opacity: 0, x: -12, transition: { duration: 0.15 } },
};

// ── Sub-components ───────────────────────────────────────────────────────────

function PasswordInput({
  label, value, onChange, placeholder, autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-white/70">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          autoComplete={autoComplete}
          required
          className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 pr-10 text-sm text-white placeholder:text-white/30 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-lime"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function FieldInput({
  label, type = "text", value, onChange, placeholder, required: req = true, autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-white/70">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={req}
        autoComplete={autoComplete}
        className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-lime"
      />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
    >
      {message}
    </motion.div>
  );
}

// ── Login form ───────────────────────────────────────────────────────────────

function LoginForm({ onSwitch, onClose }: { onSwitch: () => void; onClose: () => void }) {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", data.user.id).single();

      if (profile?.role === "club_admin") {
        const { data: club } = await supabase
          .from("clubs").select("status").eq("admin_id", data.user.id).single();

        if (!club || club.status === "pending") {
          await supabase.auth.signOut();
          setError("Your application is still pending review. You will be notified once approved.");
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
    <motion.div key="login" variants={formVariants} initial="hidden" animate="show" exit="exit">
      {/* Logo */}
      <div className="mb-6 text-center">
        <Image src="/freakingball.png" alt="FreakingBall" width={160} height={54} className="mx-auto object-contain" />
        <h2 className="mt-4 text-xl font-black text-white">Welcome Back!</h2>
        <p className="mt-1 text-sm text-white/50">Sign in to manage your pickleball club.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldInput label="Email" type="email" value={email} onChange={setEmail}
          placeholder="admin@club.com" autoComplete="email" />
        <PasswordInput label="Password" value={password} onChange={setPassword}
          autoComplete="current-password" />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-brand-lime" />
            <span className="text-xs text-white/40">Remember me</span>
          </label>
          <button type="button" className="text-xs text-brand-lime hover:underline">
            Forgot password?
          </button>
        </div>

        {error && <ErrorBox message={error} />}

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-lime py-3 text-sm font-bold text-[#0d1810] shadow-[0_0_20px_rgba(183,255,114,0.2)] transition-shadow hover:shadow-[0_0_30px_rgba(183,255,114,0.35)] disabled:opacity-60"
        >
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0d1810] border-t-transparent" />}
          {loading ? "Signing in…" : "Sign In"}
        </motion.button>
      </form>

      <p className="mt-5 text-center text-sm text-white/40">
        Don&apos;t have an account?{" "}
        <button onClick={onSwitch} className="font-semibold text-brand-lime hover:underline">
          Sign up
        </button>
      </p>
    </motion.div>
  );
}

// ── Register form ────────────────────────────────────────────────────────────

function RegisterForm({
  onSwitch,
  onClose,
  setLegalModal,
}: {
  onSwitch: () => void;
  onClose: () => void;
  setLegalModal: (v: "privacy" | "terms") => void;
}) {
  const [form, setForm] = useState({
    fullName: "", email: "", password: "", confirmPassword: "",
    clubName: "", clubLocation: "", contactPhone: "",
  });
  const [agreed, setAgreed]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
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
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { role: "club_admin", full_name: form.fullName } },
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Registration failed.");
      setLoading(false);
      return;
    }

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
      <motion.div key="success" variants={formVariants} initial="hidden" animate="show"
        className="py-4 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-lime/15">
          <span className="text-3xl">🎾</span>
        </div>
        <h2 className="text-xl font-black text-white">Application Submitted!</h2>
        <p className="mt-2 text-sm text-white/50">
          Your club registration is pending review. We&apos;ll notify you once approved.
          This usually takes 1–2 business days.
        </p>
        <button onClick={onClose}
          className="mt-6 rounded-xl border border-white/15 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5">
          Close
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div key="register" variants={formVariants} initial="hidden" animate="show" exit="exit">
      {/* Logo */}
      <div className="mb-5 text-center">
        <Image src="/freakingball.png" alt="FreakingBall" width={140} height={47} className="mx-auto object-contain" />
        <h2 className="mt-4 text-xl font-black text-white">Create Your Club Account</h2>
        <p className="mt-1 text-sm text-white/50">Everything your pickleball club needs, in one place.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-lime/80">Admin Account</p>
        <FieldInput label="Full Name" value={form.fullName} onChange={(v) => update("fullName", v)}
          placeholder="Juan dela Cruz" />
        <FieldInput label="Email" type="email" value={form.email} onChange={(v) => update("email", v)}
          placeholder="juan@club.com" autoComplete="email" />
        <PasswordInput label="Password" value={form.password} onChange={(v) => update("password", v)}
          placeholder="Min 8 characters" autoComplete="new-password" />
        <PasswordInput label="Confirm Password" value={form.confirmPassword}
          onChange={(v) => update("confirmPassword", v)} placeholder="Repeat password"
          autoComplete="new-password" />

        <p className="pt-1 text-[10px] font-bold uppercase tracking-widest text-brand-lime/80">Club Details</p>
        <FieldInput label="Club Name" value={form.clubName} onChange={(v) => update("clubName", v)}
          placeholder="Manila Picklers Club" />
        <FieldInput label="Location" value={form.clubLocation} onChange={(v) => update("clubLocation", v)}
          placeholder="Quezon City, Metro Manila" required={false} />
        <FieldInput label="Contact Phone (optional)" type="tel" value={form.contactPhone}
          onChange={(v) => update("contactPhone", v)} placeholder="+63 9XX XXX XXXX" required={false} />

        <label className="flex cursor-pointer items-start gap-2.5 pt-1">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-white/5 accent-brand-lime" />
          <span className="text-xs text-white/40 leading-relaxed">
            I agree to the{" "}
            <button type="button" onClick={() => setLegalModal("terms")}
              className="text-brand-lime hover:underline">Terms of Service</button>
            {" "}and{" "}
            <button type="button" onClick={() => setLegalModal("privacy")}
              className="text-brand-lime hover:underline">Privacy Policy</button>
          </span>
        </label>

        {error && <ErrorBox message={error} />}

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-lime py-3 text-sm font-bold text-[#0d1810] shadow-[0_0_20px_rgba(183,255,114,0.2)] transition-shadow hover:shadow-[0_0_30px_rgba(183,255,114,0.35)] disabled:opacity-60"
        >
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0d1810] border-t-transparent" />}
          {loading ? "Submitting…" : "Submit Application"}
        </motion.button>
      </form>

      <p className="mt-4 text-center text-sm text-white/40">
        Already have an account?{" "}
        <button onClick={onSwitch} className="font-semibold text-brand-lime hover:underline">
          Sign in
        </button>
      </p>
    </motion.div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────

export function AuthModal({ initialMode = "login", onClose }: AuthModalProps) {
  const [mode, setMode]               = useState<Mode>(initialMode);
  const [legalModal, setLegalModal]   = useState<"privacy" | "terms" | null>(null);

  // Escape key + body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Keep mode in sync if parent changes initialMode
  useEffect(() => { setMode(initialMode); }, [initialMode]);

  const switchMode = useCallback(() => {
    setMode((m) => (m === "login" ? "register" : "login"));
  }, []);

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="auth-modal-root"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial="hidden" animate="show" exit="exit"
        >
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            variants={modalVariants}
            className="relative z-10 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative max-h-[90dvh] overflow-y-auto rounded-2xl border border-white/10 p-7 shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
              style={{ background: "linear-gradient(145deg, #152019 0%, #0d1810 100%)" }}
            >
              {/* Top-right close */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl text-white/30 transition hover:bg-white/8 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Mode indicator pills */}
              <div className="mb-6 flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
                {(["login", "register"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold capitalize transition-all duration-200 ${
                      mode === m
                        ? "bg-brand-lime text-[#0d1810] shadow-[0_0_12px_rgba(183,255,114,0.3)]"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {m === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              {/* Form — animated switch */}
              <AnimatePresence mode="wait" initial={false}>
                {mode === "login" ? (
                  <LoginForm key="login" onSwitch={switchMode} onClose={onClose} />
                ) : (
                  <RegisterForm key="register" onSwitch={switchMode} onClose={onClose} setLegalModal={setLegalModal} />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Legal modal renders above auth modal */}
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
    </>
  );
}
