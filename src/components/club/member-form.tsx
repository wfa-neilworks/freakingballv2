"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Gender } from "@/types/database";
import { Camera } from "lucide-react";

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
  const [photoUrl, setPhotoUrl] = useState<string | null>(defaultValues?.photo_url ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(defaultValues?.photo_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
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

    // Upload new photo if one was selected
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

    router.push(`/club/members${isGuest ? "?tab=guests" : ""}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Photo upload */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative h-24 w-24 cursor-pointer rounded-full border-2 border-dashed border-white/20 bg-white/5 transition hover:border-brand-lime/50"
          onClick={() => fileRef.current?.click()}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Preview" className="h-full w-full rounded-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full">
              <span className="text-2xl font-black text-white/30">
                {form.full_name ? initials(form.full_name) : "?"}
              </span>
            </div>
          )}
          <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-brand-lime text-brand-dark shadow">
            <Camera className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="text-xs text-white/40">Tap to {photoPreview ? "change" : "add"} photo</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      <Input
        label="Full Name *"
        placeholder="Juan dela Cruz"
        value={form.full_name}
        onChange={(e) => update("full_name", e.target.value)}
        required
      />
      <Input
        label="Nickname (optional)"
        placeholder="JDC"
        value={form.nickname}
        onChange={(e) => update("nickname", e.target.value)}
      />
      <Input
        label="Phone (optional)"
        type="tel"
        placeholder="+63 9XX XXX XXXX"
        value={form.phone}
        onChange={(e) => update("phone", e.target.value)}
      />
      <Select
        label="Gender *"
        value={form.gender}
        onChange={(e) => update("gender", e.target.value)}
      >
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </Select>

      {isEdit && (
        <Select
          label="Status"
          value={form.is_active ? "active" : "inactive"}
          onChange={(e) => update("is_active", e.target.value === "active")}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {isEdit ? "Save Changes" : `Add ${isGuest ? "Guest" : "Member"}`}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
