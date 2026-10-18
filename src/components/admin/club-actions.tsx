"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle } from "lucide-react";

interface ClubActionsProps {
  clubId: string;
}

export function ClubActions({ clubId }: ClubActionsProps) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function approve() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from("clubs")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      })
      .eq("id", clubId);

    setLoading(false);
    router.refresh();
  }

  async function reject() {
    if (!reason.trim()) return;
    setLoading(true);
    const supabase = createClient();

    await supabase
      .from("clubs")
      .update({
        status: "rejected",
        rejection_reason: reason.trim(),
      })
      .eq("id", clubId);

    setLoading(false);
    router.refresh();
  }

  if (rejecting) {
    return (
      <div className="flex flex-col gap-2 sm:w-64">
        <Input
          placeholder="Rejection reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="danger"
            loading={loading}
            onClick={reject}
            disabled={!reason.trim()}
            className="flex-1"
          >
            Confirm Reject
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setRejecting(false); setReason(""); }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button
        size="sm"
        variant="primary"
        loading={loading}
        onClick={approve}
      >
        <CheckCircle className="h-4 w-4" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="danger"
        onClick={() => setRejecting(true)}
      >
        <XCircle className="h-4 w-4" />
        Reject
      </Button>
    </div>
  );
}
