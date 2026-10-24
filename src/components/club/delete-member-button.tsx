"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2, X } from "lucide-react";

interface DeleteMemberButtonProps {
  memberId: string;
  memberName: string;
}

export function DeleteMemberButton({ memberId, memberName }: DeleteMemberButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("members").update({ is_active: false }).eq("id", memberId);
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-400/10"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Dialog */}
          <div
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#18251D] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:bg-white/8 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon */}
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15">
              <Trash2 className="h-6 w-6 text-red-400" />
            </div>

            <h2 className="text-lg font-black text-white">Deactivate Member</h2>
            <p className="mt-1.5 text-sm text-white/50">
              Are you sure you want to deactivate <span className="font-semibold text-white">{memberName}</span>? They will no longer appear as active.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {loading ? "Deactivating…" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
