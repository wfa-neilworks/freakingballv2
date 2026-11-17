"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { AppModal } from "@/components/ui/app-modal";
import { Button } from "@/components/ui/button";
import type { Gender, SkillLevel } from "@/types/database";
import { getStartingRating, SKILL_LEVELS } from "@/lib/rating";
import {
  UserPlus,
  UserCog,
  Camera,
  User,
  Phone,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
  Star,
  Activity,
} from "lucide-react";

/* ── Types ───────────────────────────────────────────────── */
export interface MemberModalValues {
  id: string;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  gender: Gender;
  is_active: boolean;
  photo_url: string | null;
  is_guest: boolean;
  skill_level?: SkillLevel;
  rating?: number;
}

interface MemberFormModalProps {
  open: boolean;
  onClose: () => void;
  clubId: string;
  defaultValues?: MemberModalValues;
  isGuest?: boolean;
}

/* ── Level config ────────────────────────────────────────── */
const LEVEL_COLOR: Record<SkillLevel, { dot: string; text: string; bg: string }> = {
  beginner:     { dot: "#94a3b8", text: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
  novice:       { dot: "#60a5fa", text: "#60a5fa", bg: "rgba(96,165,250,0.08)" },
  intermediate: { dot: "#34d399", text: "#34d399", bg: "rgba(52,211,153,0.08)" },
  advanced:     { dot: "#fb923c", text: "#fb923c", bg: "rgba(251,146,60,0.08)" },
  expert:       { dot: "#fbbf24", text: "#fbbf24", bg: "rgba(251,191,36,0.08)" },
};

/* ── Field primitives ────────────────────────────────────── */
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
      {children}
      {required && <span className="text-brand-lime/70">*</span>}
    </label>
  );
}

function TextInput({
  label, required, icon: Icon, hint, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string; required?: boolean; icon?: React.ElementType; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div
        className="flex items-center gap-2.5 rounded-xl border px-3 transition-all duration-150"
        style={{
          height: "40px",
          background: focused ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.03)",
          borderColor: focused ? "#b7ff72" : "rgba(255,255,255,0.07)",
          boxShadow: focused ? "0 0 0 3px rgba(183,255,114,0.07)" : "none",
        }}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-white/20" />}
        <input
          {...props}
          required={required}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          className="flex-1 bg-transparent text-[13px] text-white/90 placeholder:text-white/18 focus:outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-[10px] text-white/20">{hint}</p>}
    </div>
  );
}

function SelectInput({
  label, required, options, value, onChange, icon: Icon,
}: {
  label: string; required?: boolean;
  options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
  icon?: React.ElementType;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div
        className="relative flex items-center rounded-xl border transition-all duration-150"
        style={{
          height: "40px",
          background: focused ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.03)",
          borderColor: focused ? "#b7ff72" : "rgba(255,255,255,0.07)",
          boxShadow: focused ? "0 0 0 3px rgba(183,255,114,0.07)" : "none",
        }}
      >
        {Icon && <Icon className="ml-3 h-3.5 w-3.5 shrink-0 text-white/20" />}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`flex-1 appearance-none bg-transparent text-[13px] text-white/90 focus:outline-none pr-8 ${Icon ? "pl-2.5" : "pl-3"}`}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: "#0f1a12" }}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-white/20" />
      </div>
    </div>
  );
}

/* ── Section divider ─────────────────────────────────────── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">{label}</span>
        <div className="flex-1 border-t border-white/[0.05]" />
      </div>
      {children}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */
export function MemberFormModal({
  open, onClose, clubId, defaultValues, isGuest: isGuestProp = false,
}: MemberFormModalProps) {
  const router = useRouter();
  const isEdit = !!defaultValues;
  const isGuest = isEdit ? (defaultValues.is_guest ?? isGuestProp) : isGuestProp;
  const fileRef = useRef<HTMLInputElement>(null);

  const blankForm = {
    full_name:   "",
    nickname:    "",
    phone:       "",
    gender:      "male" as Gender,
    is_active:   true,
    skill_level: "beginner" as SkillLevel,
    rating:      200,
  };

  const [form, setForm] = useState(blankForm);
  const [photoUrl, setPhotoUrl]         = useState<string | null>(null);
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setForm({
      full_name:   defaultValues?.full_name   ?? "",
      nickname:    defaultValues?.nickname    ?? "",
      phone:       defaultValues?.phone       ?? "",
      gender:      (defaultValues?.gender     ?? "male") as Gender,
      is_active:   defaultValues?.is_active   ?? true,
      skill_level: (defaultValues?.skill_level ?? "beginner") as SkillLevel,
      rating:      defaultValues?.rating      ?? 200,
    });
    setPhotoUrl(defaultValues?.photo_url ?? null);
    setPhotoPreview(defaultValues?.photo_url ?? null);
    setPhotoFile(null);
    setError(null);
    setSuccess(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues?.id, open]);

  function update(field: string, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function initials(name: string) {
    return name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  }

  function handleClose() {
    if (loading) return;
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    let finalPhotoUrl = photoUrl;

    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const memberId = defaultValues?.id ?? crypto.randomUUID();
      const path = `${clubId}/${memberId}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("member-photos")
        .upload(path, photoFile, { upsert: true });
      if (uploadErr) { setError(uploadErr.message); setLoading(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("member-photos").getPublicUrl(path);
      finalPhotoUrl = publicUrl;
    }

    const payload = {
      full_name: form.full_name.trim(),
      nickname:  form.nickname.trim() || null,
      phone:     form.phone.trim()    || null,
      gender:    form.gender,
      is_active: form.is_active,
      photo_url: finalPhotoUrl,
    };

    if (isEdit) {
      const { error: err } = await supabase.from("members").update({
        ...payload,
        skill_level: form.skill_level,
        rating: form.rating,
      }).eq("id", defaultValues.id);
      if (err) { setError(err.message); setLoading(false); return; }
    } else {
      const startingRating = getStartingRating(form.skill_level);
      const { error: err } = await supabase.from("members").insert({
        ...payload,
        club_id: clubId,
        is_guest: isGuest,
        skill_level: form.skill_level,
        rating: startingRating,
        total_rated_games: 0,
      });
      if (err) { setError(err.message); setLoading(false); return; }
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => {
      handleClose();
      router.refresh();
    }, 800);
  }

  const canSubmit = form.full_name.trim() && !loading && !success;
  const levelCfg = LEVEL_COLOR[form.skill_level] ?? LEVEL_COLOR.beginner;

  return (
    <AppModal open={open} onClose={handleClose} maxWidth="max-w-[600px]">
      <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: "inherit" }}>

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-5 py-4">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: isEdit ? "rgba(96,165,250,0.12)" : "rgba(183,255,114,0.1)" }}
          >
            {isEdit
              ? <UserCog className="h-4 w-4 text-blue-400" />
              : <UserPlus className="h-4 w-4 text-brand-lime" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white leading-tight">
              {isEdit ? `Edit ${isGuest ? "Guest" : "Member"}` : `Add ${isGuest ? "Guest Player" : "Club Member"}`}
            </h2>
            <p className="text-[11px] text-white/35 truncate mt-0.5">
              {isEdit ? defaultValues.full_name : isGuest ? "Guest players can join sessions without full membership" : "Add a new player to your club roster"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/25 transition-colors hover:bg-white/8 hover:text-white/70"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-0 sm:grid-cols-[160px_1fr]">

            {/* Left — avatar panel */}
            <div
              className="flex flex-col items-center justify-start gap-3 border-b border-white/[0.05] px-5 py-6 sm:border-b-0 sm:border-r"
              style={{ background: "rgba(255,255,255,0.015)" }}
            >
              {/* Avatar */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group relative flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/10 transition-all duration-200 hover:border-brand-lime/40"
                  style={{ background: photoPreview ? "transparent" : "rgba(255,255,255,0.04)" }}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black tracking-tight text-white/20">
                      {form.full_name ? initials(form.full_name) : "?"}
                    </span>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
                    <Camera className="h-4 w-4 text-white" />
                    <span className="text-[9px] font-semibold text-white/80 uppercase tracking-wider">
                      {photoPreview ? "Change" : "Upload"}
                    </span>
                  </div>
                </button>
                <AnimatePresence>
                  {photoPreview && (
                    <motion.button
                      type="button"
                      onClick={removePhoto}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-white shadow-md transition hover:bg-red-500"
                    >
                      <X className="h-2.5 w-2.5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-[11px] font-medium text-white/25 transition-colors hover:text-brand-lime"
                >
                  {photoPreview ? "Change photo" : "Add photo"}
                </button>
                <p className="mt-0.5 text-[9px] text-white/15 tracking-wide">JPG · PNG · WebP</p>
              </div>

              {/* Level chip — visual indicator */}
              <div
                className="mt-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
                style={{ background: levelCfg.bg, color: levelCfg.text }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: levelCfg.dot }}
                />
                {SKILL_LEVELS[form.skill_level].label}
                {isEdit && (
                  <span className="ml-0.5 text-[10px] opacity-50">· {form.rating}</span>
                )}
              </div>
            </div>

            {/* Right — fields */}
            <div className="space-y-5 px-5 py-6">

              <Section label="Personal">
                <div className="space-y-2.5">
                  <TextInput
                    label="Full Name" required icon={User}
                    placeholder="e.g. Juan dela Cruz"
                    value={form.full_name}
                    onChange={(e) => update("full_name", e.target.value)}
                    autoComplete="name"
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    <TextInput
                      label="Nickname"
                      placeholder="JDC"
                      value={form.nickname}
                      onChange={(e) => update("nickname", e.target.value)}
                    />
                    <TextInput
                      label="Phone" type="tel" icon={Phone}
                      placeholder="+63 9XX XXX XXXX"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </div>
                  <div className={isEdit ? "grid grid-cols-2 gap-2.5" : ""}>
                    <SelectInput
                      label="Gender" required value={form.gender}
                      onChange={(v) => update("gender", v)}
                      options={[
                        { value: "male",   label: "Male" },
                        { value: "female", label: "Female" },
                        { value: "other",  label: "Other" },
                      ]}
                    />
                    {isEdit && (
                      <SelectInput
                        label="Status" value={form.is_active ? "active" : "inactive"}
                        onChange={(v) => update("is_active", v === "active")}
                        options={[
                          { value: "active",   label: "Active" },
                          { value: "inactive", label: "Inactive" },
                        ]}
                      />
                    )}
                  </div>
                </div>
              </Section>

              <Section label="Skill & Rating">
                <div className="space-y-2.5">
                  <SelectInput
                    label={isEdit ? "Skill Level" : "Starting Level"}
                    required
                    icon={Star}
                    value={form.skill_level}
                    onChange={(v) => {
                      update("skill_level", v);
                      if (!isEdit) update("rating", getStartingRating(v as SkillLevel));
                    }}
                    options={[
                      { value: "beginner",     label: "Beginner — 100 to 299" },
                      { value: "novice",       label: "Novice — 300 to 449" },
                      { value: "intermediate", label: "Intermediate — 450 to 599" },
                      { value: "advanced",     label: "Advanced — 600 to 749" },
                      { value: "expert",       label: "Expert — 750 to 1000" },
                    ]}
                  />
                  {isEdit && (
                    <TextInput
                      label="Rating"
                      type="number"
                      icon={Activity}
                      value={String(form.rating)}
                      onChange={(e) => {
                        const v = Math.min(1000, Math.max(100, Number(e.target.value) || 100));
                        update("rating", v);
                      }}
                      hint="Range: 100 (floor) to 1000 (ceiling)"
                      min={100}
                      max={1000}
                    />
                  )}
                  {!isEdit && (
                    <p className="text-[11px] text-white/25 leading-relaxed">
                      Starting rating is set automatically from the selected level. It will adjust as matches are played.
                    </p>
                  )}
                </div>
              </Section>
            </div>
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mx-5 mb-4 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-3.5 py-2.5"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                <p className="text-xs text-red-400">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="mx-5 mb-4 flex items-center gap-2.5 rounded-xl border border-brand-lime/20 bg-brand-lime/6 px-3.5 py-2.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand-lime" />
                <p className="text-xs font-medium text-brand-lime">
                  {isEdit ? "Changes saved!" : "Member added!"} Refreshing…
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3.5">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
          >
            Cancel
          </button>
          <Button
            type="submit"
            loading={loading}
            disabled={!canSubmit}
            size="lg"
            className="min-w-[140px] text-sm"
          >
            {success ? "Saved!" : isEdit ? "Save Changes" : `Add ${isGuest ? "Guest" : "Member"}`}
          </Button>
        </div>

      </form>
    </AppModal>
  );
}
