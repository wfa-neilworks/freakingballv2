"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { Gender } from "@/types/database";
import {
  Camera,
  User,
  Phone,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  X,
  ImagePlus,
} from "lucide-react";

interface MemberFormProps {
  clubId: string;
  isGuest: boolean;
  defaultValues?: {
    id: string;
    full_name: string;
    nickname: string | null;
    phone: string | null;
    gender: Gender;
    is_active: boolean;
    photo_url: string | null;
  };
}

/* ── Shared field components ──────────────────────────────── */
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/35">
      {children}
      {required && <span className="text-brand-lime">*</span>}
    </label>
  );
}

function TextInput({
  label,
  required,
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  required?: boolean;
  icon?: React.ElementType;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div
        className="flex items-center gap-3 rounded-xl border px-3.5 transition-all duration-150"
        style={{
          height: "44px",
          background: "rgba(255,255,255,0.04)",
          borderColor: focused ? "#b7ff72" : "rgba(255,255,255,0.08)",
          boxShadow: focused ? "0 0 0 3px rgba(183,255,114,0.08)" : "none",
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

function SelectInput({
  label,
  required,
  options,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div
        className="relative flex items-center rounded-xl border transition-all duration-150"
        style={{
          height: "44px",
          background: "rgba(255,255,255,0.04)",
          borderColor: focused ? "#b7ff72" : "rgba(255,255,255,0.08)",
          boxShadow: focused ? "0 0 0 3px rgba(183,255,114,0.08)" : "none",
        }}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 appearance-none bg-transparent pl-3.5 pr-8 text-sm text-white focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: "#18251D" }}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-white/25" />
      </div>
    </div>
  );
}

/* ── Main form ──────────────────────────────────────────────── */
export function MemberForm({ clubId, isGuest, defaultValues }: MemberFormProps) {
  const router = useRouter();
  const isEdit = !!defaultValues;
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: defaultValues?.full_name ?? "",
    nickname: defaultValues?.nickname ?? "",
    phone: defaultValues?.phone ?? "",
    gender: (defaultValues?.gender ?? "male") as Gender,
    is_active: defaultValues?.is_active ?? true,
  });

  const [photoUrl] = useState<string | null>(defaultValues?.photo_url ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(defaultValues?.photo_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function update(field: string, value: string | boolean) {
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
      nickname: form.nickname.trim() || null,
      phone: form.phone.trim() || null,
      gender: form.gender,
      is_active: form.is_active,
      photo_url: finalPhotoUrl,
    };

    if (isEdit) {
      const { error: err } = await supabase.from("members").update(payload).eq("id", defaultValues.id);
      if (err) { setError(err.message); setLoading(false); return; }
    } else {
      const { error: err } = await supabase.from("members").insert({
        ...payload,
        club_id: clubId,
        is_guest: isGuest,
      });
      if (err) { setError(err.message); setLoading(false); return; }
    }

    setSuccess(true);
    setTimeout(() => {
      router.push(`/club/members${isGuest ? "?tab=guests" : ""}`);
      router.refresh();
    }, 700);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Two-column desktop layout ──────────────────── */}
      <div className="grid gap-8 lg:grid-cols-[180px_1fr]">

        {/* LEFT: Photo upload */}
        <div className="flex flex-col items-center gap-3 lg:pt-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative block h-[116px] w-[116px] overflow-hidden rounded-full border-2 border-dashed border-white/12 bg-white/[0.035] transition-all duration-200 hover:border-brand-lime/40 hover:bg-white/[0.06]"
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
                  {form.full_name ? (
                    <span className="text-3xl font-black text-white/20">
                      {initials(form.full_name)}
                    </span>
                  ) : (
                    <ImagePlus className="h-7 w-7 text-white/15" />
                  )}
                </div>
              )}
              {/* Camera hover overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
                <span className="text-[10px] font-semibold text-white/80">
                  {photoPreview ? "Change" : "Upload"}
                </span>
              </div>
            </button>

            {/* Remove badge */}
            <AnimatePresence>
              {photoPreview && (
                <motion.button
                  type="button"
                  onClick={removePhoto}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute -right-0.5 -top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-colors hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
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
              className="text-xs font-medium text-white/30 transition-colors hover:text-brand-lime"
            >
              {photoPreview ? "Change photo" : "Add photo"}
            </button>
            <p className="mt-0.5 text-[10px] text-white/15">JPG · PNG · WebP</p>
          </div>
        </div>

        {/* RIGHT: Fields */}
        <div className="space-y-5">
          {/* Section label */}
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20">
            Personal Information
          </p>

          <TextInput
            label="Full Name"
            required
            icon={User}
            placeholder="Juan dela Cruz"
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            autoComplete="name"
          />

          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Nickname"
              placeholder="JDC"
              value={form.nickname}
              onChange={(e) => update("nickname", e.target.value)}
            />
            <TextInput
              label="Phone"
              type="tel"
              icon={Phone}
              placeholder="+63 9XX XXX XXXX"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              autoComplete="tel"
            />
          </div>

          <div className={isEdit ? "grid grid-cols-2 gap-3" : ""}>
            <SelectInput
              label="Gender"
              required
              value={form.gender}
              onChange={(v) => update("gender", v)}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
            />
            {isEdit && (
              <SelectInput
                label="Status"
                value={form.is_active ? "active" : "inactive"}
                onChange={(v) => update("is_active", v === "active")}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Feedback ─────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex items-center gap-3 rounded-xl border border-brand-lime/20 bg-brand-lime/6 px-4 py-3"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-lime" />
            <p className="text-sm font-medium text-brand-lime">
              {isEdit ? "Changes saved — redirecting…" : "Member added — redirecting…"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Form actions ─────────────────────────────────── */}
      <div className="mt-7 flex items-center justify-between border-t border-white/[0.06] pt-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-white/30 transition-colors hover:text-white/60"
        >
          ← Cancel
        </button>
        <Button
          type="submit"
          loading={loading}
          disabled={!form.full_name.trim() || loading || success}
          size="lg"
          className="min-w-[160px]"
        >
          {success ? "Saved!" : isEdit ? "Save Changes" : `Add ${isGuest ? "Guest" : "Member"}`}
        </Button>
      </div>
    </form>
  );
}
