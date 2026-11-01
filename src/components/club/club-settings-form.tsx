"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Upload, Camera, ImageIcon, Building2, User, MapPin, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface Props {
  club: {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    logo_url: string | null;
    president: string | null;
  };
  userId: string;
}

/* ─── Field wrapper ──────────────────────────────────────────── */
function Field({
  label,
  required,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/35">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
        {required && <span className="text-brand-lime">*</span>}
      </label>
      {children}
    </div>
  );
}

/* ─── Text input ─────────────────────────────────────────────── */
function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="flex items-center rounded-xl border transition-all duration-150"
      style={{
        height: "42px",
        background: "rgba(255,255,255,0.04)",
        borderColor: focused ? "#b7ff72" : "rgba(255,255,255,0.08)",
        boxShadow: focused ? "0 0 0 3px rgba(183,255,114,0.07)" : "none",
      }}
    >
      <input
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        className="flex-1 bg-transparent px-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none"
      />
    </div>
  );
}

/* ─── Textarea input ─────────────────────────────────────────── */
function TextAreaInput(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="rounded-xl border transition-all duration-150"
      style={{
        background: "rgba(255,255,255,0.04)",
        borderColor: focused ? "#b7ff72" : "rgba(255,255,255,0.08)",
        boxShadow: focused ? "0 0 0 3px rgba(183,255,114,0.07)" : "none",
      }}
    >
      <textarea
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        className="w-full resize-none bg-transparent px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none"
      />
    </div>
  );
}

/* ─── Section card ───────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/[0.07]"
      style={{ background: "rgba(255,255,255,0.035)" }}
    >
      <div className="border-b border-white/[0.06] px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export function ClubSettingsForm({ club, userId }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName]               = useState(club.name);
  const [description, setDescription] = useState(club.description ?? "");
  const [location, setLocation]       = useState(club.location ?? "");
  const [president, setPresident]     = useState(club.president ?? "");
  const [logoUrl, setLogoUrl]         = useState(club.logo_url ?? "");
  const [logoPreview, setLogoPreview] = useState(club.logo_url ?? "");
  const [uploading, setUploading]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Logo must be under 2MB"); return; }

    setUploading(true);
    setError(null);
    setLogoPreview(URL.createObjectURL(file));

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${userId}/logo.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("club-logos").upload(path, file, { upsert: true });

    if (uploadErr) {
      setError("Upload failed: " + uploadErr.message);
      setLogoPreview(club.logo_url ?? "");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("club-logos").getPublicUrl(path);
    setLogoUrl(publicUrl + "?t=" + Date.now());
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Club name is required"); return; }
    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: err } = await supabase.from("clubs").update({
      name: name.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      president: president.trim() || null,
      logo_url: logoUrl || null,
    }).eq("id", club.id);

    setSaving(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
    router.refresh();
    setTimeout(() => setSuccess(false), 4000);
  }

  const initials = name.trim().slice(0, 2).toUpperCase() || "?";

  return (
    <form onSubmit={handleSave} className="space-y-4">

      {/* ── Branding ──────────────────────────────────────────── */}
      <Section title="Club Branding">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          {/* Logo preview */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl transition-all duration-200"
            style={{
              background: logoPreview ? "transparent" : "rgba(183,255,114,0.08)",
              border: "2px dashed rgba(255,255,255,0.12)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(183,255,114,0.4)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
          >
            {logoPreview ? (
              <Image src={logoPreview} alt="Club logo" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <ImageIcon className="h-6 w-6 text-white/20" />
                <span className="text-[10px] text-white/20">Logo</span>
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5 text-white" />
              <span className="text-[10px] font-semibold text-white/80">{logoPreview ? "Change" : "Upload"}</span>
            </div>
          </button>

          {/* Upload controls */}
          <div className="flex-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm font-medium text-white/60 transition-all duration-150 hover:border-white/[0.18] hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : logoPreview ? "Replace Logo" : "Upload Logo"}
            </button>
            <p className="mt-2 text-[11px] text-white/25">PNG · JPG · WebP &nbsp;·&nbsp; max 2 MB</p>
          </div>

          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
        </div>
      </Section>

      {/* ── Club Information ───────────────────────────────────── */}
      <Section title="Club Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Club Name" required icon={Building2}>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Club Name"
              />
            </Field>
          </div>
          <Field label="Club President" icon={User}>
            <TextInput
              value={president}
              onChange={(e) => setPresident(e.target.value)}
              placeholder="Full name"
            />
          </Field>
          <Field label="Location" icon={MapPin}>
            <TextInput
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Province"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" icon={FileText}>
              <TextAreaInput
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="A short description of your club…"
              />
            </Field>
          </div>
        </div>
      </Section>

      {/* ── Feedback ──────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-xl border border-brand-lime/20 bg-brand-lime/6 px-4 py-3"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-lime" />
            <p className="text-sm font-medium text-brand-lime">Club updated successfully</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Save action ───────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || uploading}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-lime px-5 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-brand-lime/90 hover:shadow-[0_0_20px_rgba(183,255,114,0.2)] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
