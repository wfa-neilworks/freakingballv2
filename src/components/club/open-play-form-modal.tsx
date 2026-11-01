"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppModal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import type { PlayType, PartnerMode } from "@/types/database";
import {
  PlayCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Hash,
  Tag,
  Users2,
  Shuffle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Field components reused from form design system ──────── */
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
          style={{ colorScheme: "dark" }}
        />
      </div>
    </div>
  );
}

function SelectInput({
  label, required, options, value, onChange, icon: Icon,
}: {
  label: string; required?: boolean; icon?: React.ElementType;
  options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const { default: _, ...rest } = { default: undefined }; // unused
  void rest;
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div
        className="relative flex items-center rounded-xl border transition-all duration-150"
        style={{
          height: "42px",
          background: "rgba(255,255,255,0.04)",
          borderColor: focused ? "#b7ff72" : "rgba(255,255,255,0.08)",
          boxShadow: focused ? "0 0 0 3px rgba(183,255,114,0.07)" : "none",
        }}
      >
        {Icon && <Icon className="pointer-events-none absolute left-3.5 h-4 w-4 text-white/20" />}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`flex-1 appearance-none bg-transparent ${Icon ? "pl-9" : "pl-3.5"} pr-8 text-sm text-white focus:outline-none`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: "#131f16" }}>{o.label}</option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-3 h-4 w-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/20">
      {children}
    </p>
  );
}

/* ── Main modal component ─────────────────────────────────── */
interface OpenPlayFormModalProps {
  open: boolean;
  onClose: () => void;
  clubId: string;
  adminId: string;
}

export function OpenPlayFormModal({ open, onClose, clubId, adminId }: OpenPlayFormModalProps) {
  const router = useRouter();

  const defaultForm = {
    name: "",
    play_type: "doubles" as PlayType,
    doubles_category: "mens",
    partner_mode: "rotating" as PartnerMode,
    date_time: "",
    location: "",
    num_courts: "2",
  };

  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isSingles = form.play_type === "singles";
  const showCategory = form.play_type === "doubles";
  const showPartner = !isSingles;

  const isDirty = form.name || form.location || form.date_time;

  function handleClose() {
    if (loading) return;
    onClose();
    // Reset after exit animation
    setTimeout(() => {
      setForm(defaultForm);
      setError(null);
    }, 300);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("open_plays")
      .insert({
        club_id: clubId,
        name: form.name.trim(),
        play_type: form.play_type,
        doubles_category: showCategory ? (form.doubles_category as "mens" | "womens") : null,
        partner_mode: showPartner ? form.partner_mode : null,
        date_time: new Date(form.date_time).toISOString(),
        location: form.location.trim(),
        num_courts: parseInt(form.num_courts, 10),
        status: "scheduled",
        created_by: adminId,
      })
      .select("id")
      .single();

    if (err || !data) {
      setError(err?.message ?? "Failed to create session.");
      setLoading(false);
      return;
    }

    setLoading(false);
    handleClose();
    router.refresh();
    // Navigate to the new session detail
    router.push(`/club/open-play/${data.id}`);
  }

  const canSubmit = form.name.trim() && form.date_time && form.location.trim() && !loading;

  return (
    <AppModal open={open} onClose={handleClose} maxWidth="max-w-[700px]">
      <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: "inherit" }}>

        <ModalHeader
          icon={<PlayCircle className="h-4.5 w-4.5 h-[18px] w-[18px] text-brand-lime" />}
          title="Create Open Play Session"
          subtitle="Set up your next club playing session"
          onClose={handleClose}
        />

        <ModalBody>
          <div className="space-y-6">

            {/* Section 1 – Session details */}
            <div>
              <SectionLabel>Session Details</SectionLabel>
              <div className="space-y-3">
                <TextInput
                  label="Session Name"
                  required
                  icon={Tag}
                  placeholder="Friday Evening Open Play"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <SelectInput
                    label="Play Type"
                    required
                    icon={Users2}
                    value={form.play_type}
                    onChange={(v) => update("play_type", v)}
                    options={[
                      { value: "singles",       label: "Singles" },
                      { value: "doubles",       label: "Doubles" },
                      { value: "mixed_doubles", label: "Mixed Doubles" },
                      { value: "open_doubles",  label: "Open Doubles" },
                    ]}
                  />
                  <AnimatePresence mode="wait">
                    {showCategory ? (
                      <motion.div
                        key="cat"
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        transition={{ duration: 0.15 }}
                      >
                        <SelectInput
                          label="Doubles Category"
                          required
                          value={form.doubles_category}
                          onChange={(v) => update("doubles_category", v)}
                          options={[
                            { value: "mens",   label: "Men's Doubles" },
                            { value: "womens", label: "Women's Doubles" },
                          ]}
                        />
                      </motion.div>
                    ) : showPartner ? (
                      <motion.div
                        key="partner"
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        transition={{ duration: 0.15 }}
                      >
                        <SelectInput
                          label="Partner Mode"
                          icon={Shuffle}
                          value={form.partner_mode}
                          onChange={(v) => update("partner_mode", v)}
                          options={[
                            { value: "rotating", label: "Rotating Partners" },
                            { value: "fixed",    label: "Fixed Partners" },
                          ]}
                        />
                      </motion.div>
                    ) : <div key="empty" />}
                  </AnimatePresence>
                </div>
                <AnimatePresence>
                  {showPartner && showCategory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <SelectInput
                        label="Partner Mode"
                        icon={Shuffle}
                        value={form.partner_mode}
                        onChange={(v) => update("partner_mode", v)}
                        options={[
                          { value: "rotating", label: "Rotating Partners" },
                          { value: "fixed",    label: "Fixed Partners" },
                        ]}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Section 2 – Schedule */}
            <div>
              <SectionLabel>Schedule</SectionLabel>
              <TextInput
                label="Date & Time"
                required
                type="datetime-local"
                icon={Calendar}
                value={form.date_time}
                onChange={(e) => update("date_time", e.target.value)}
              />
            </div>

            {/* Section 3 – Location & courts */}
            <div>
              <SectionLabel>Location & Courts</SectionLabel>
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <TextInput
                  label="Location"
                  required
                  icon={MapPin}
                  placeholder="SM MOA Sports Complex"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                />
                <TextInput
                  label="Courts"
                  required
                  type="number"
                  icon={Hash}
                  min="1"
                  max="20"
                  placeholder="2"
                  value={form.num_courts}
                  onChange={(e) => update("num_courts", e.target.value)}
                />
              </div>
            </div>

          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm font-medium text-white/30 transition-colors hover:text-white/60"
          >
            Cancel
          </button>
          <Button
            type="submit"
            loading={loading}
            disabled={!canSubmit}
            size="lg"
            className="min-w-[160px]"
          >
            Create Session
          </Button>
        </ModalFooter>

      </form>
    </AppModal>
  );
}
