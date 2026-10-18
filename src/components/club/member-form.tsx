"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Gender } from "@/types/database";

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
  };
}

export function MemberForm({ clubId, isGuest, defaultValues }: MemberFormProps) {
  const router = useRouter();
  const isEdit = !!defaultValues;

  const [form, setForm] = useState({
    full_name: defaultValues?.full_name ?? "",
    nickname: defaultValues?.nickname ?? "",
    phone: defaultValues?.phone ?? "",
    gender: (defaultValues?.gender ?? "male") as Gender,
    is_active: defaultValues?.is_active ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const payload = {
      full_name: form.full_name.trim(),
      nickname: form.nickname.trim() || null,
      phone: form.phone.trim() || null,
      gender: form.gender,
      is_active: form.is_active,
    };

    if (isEdit) {
      const { error: err } = await supabase
        .from("members")
        .update(payload)
        .eq("id", defaultValues.id);
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
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
