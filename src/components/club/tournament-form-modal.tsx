"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppModal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/app-modal";
import { Trophy, Tag, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/35">
      {children}
      {required && <span className="text-brand-lime">*</span>}
    </label>
  );
}

function TextInput({
  label, required, icon: Icon, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string; required?: boolean; icon?: React.ElementType;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div
        className="flex items-center gap-3 rounded-xl border px-3.5 transition-all duration-150"
        style={{
          height: "42px",
          background: "rgba(255,255,255,0.04)",
          borderColor: focused ? "#b7ff72" : "rgba(255,255,255,0.08)",
          boxShadow: focused ? "0 0 0 3px rgba(183,255,114,0.07)" : "none",
        }}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-white/20" />}
        <input
          {...props}
          required={required}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
        />
      </div>
    </div>
  );
}

interface TournamentFormModalProps {
  open: boolean;
  onClose: () => void;
  clubId: string;
  adminId: string;
}

export function TournamentFormModal({ open, onClose, clubId, adminId }: TournamentFormModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleClose() {
    if (loading) return;
    onClose();
    setTimeout(() => {
      setName("");
      setError(null);
      setSuccess(false);
    }, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Tournament name is required."); return; }
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("tournaments")
      .insert({ club_id: clubId, name: name.trim(), status: "draft", created_by: adminId })
      .select("id")
      .single();

    if (err || !data) {
      setError(err?.message ?? "Failed to create tournament.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
    setTimeout(() => {
      handleClose();
      router.push(`/club/tournaments/${data.id}`);
    }, 600);
  }

  return (
    <AppModal open={open} onClose={handleClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: "inherit" }}>

        <ModalHeader
          icon={<Trophy className="h-[18px] w-[18px] text-brand-lime" />}
          title="New Tournament"
          subtitle="Give your tournament a name — you'll add events after."
          onClose={handleClose}
        />

        <ModalBody>
          <TextInput
            label="Tournament Name"
            required
            icon={Tag}
            placeholder="e.g. Summer Smash 2025"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-center gap-3 rounded-xl border border-brand-lime/20 bg-brand-lime/6 px-4 py-3"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-lime" />
                <p className="text-sm font-medium text-brand-lime">Tournament created! Redirecting…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="text-sm font-medium text-white/30 transition-colors hover:text-white/60 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || loading || success}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-lime px-5 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-brand-lime/90 hover:shadow-[0_0_20px_rgba(183,255,114,0.2)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Creating…
              </>
            ) : "Create Tournament"}
          </button>
        </ModalFooter>

      </form>
    </AppModal>
  );
}
