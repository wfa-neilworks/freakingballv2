"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Upload, Camera } from "lucide-react";
import Image from "next/image";

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
  }

  const initials = name.trim().slice(0, 2).toUpperCase() || "?";

  const inputCls = "h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-lime";
  const labelCls = "mb-1.5 block text-xs font-medium text-white/50";

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Logo upload */}
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Club Logo</p>
        <div className="flex items-center gap-5">
          <div
            className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-brand-lime/10 ring-2 ring-white/10 transition hover:ring-brand-lime/40"
            onClick={() => fileRef.current?.click()}
          >
            {logoPreview
              ? <Image src={logoPreview} alt="Club logo" fill className="object-cover" unoptimized />
              : <span className="text-2xl font-black text-brand-lime">{initials}</span>
            }
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload Logo"}
            </button>
            <p className="mt-1.5 text-xs text-white/25">PNG, JPG or WebP · max 2MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
        </div>
      </div>

      {/* Club details */}
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/3 p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Club Details</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Club Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Swan Hill Pickleball Club" />
          </div>
          <div>
            <label className={labelCls}>Club President</label>
            <input value={president} onChange={(e) => setPresident(e.target.value)} className={inputCls} placeholder="Full name" />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="City, Province" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-brand-lime"
              placeholder="A short description of your club…" />
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
      {success && <p className="rounded-xl border border-brand-lime/20 bg-brand-lime/10 px-4 py-3 text-sm text-brand-lime">Club updated successfully</p>}

      <button type="submit" disabled={saving || uploading}
        className="rounded-xl bg-brand-lime px-6 py-2.5 text-sm font-semibold text-brand-dark transition hover:bg-brand-lime/90 disabled:opacity-50">
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}
