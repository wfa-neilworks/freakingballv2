"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, QrCode } from "lucide-react";

export function OpenPlayQR({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/open-play/${sessionId}/live`
    : `/open-play/${sessionId}/live`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <QrCode className="h-3.5 w-3.5" />
        Show QR
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-xs rounded-2xl border border-white/10 bg-[#111a13] p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-full p-1.5 text-white/30 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-lime/60">Public View</p>
            <p className="mb-4 text-sm font-semibold text-white">Scan to see live standings</p>

            <div className="flex justify-center">
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG value={url} size={200} />
              </div>
            </div>

            <p className="mt-4 break-all text-[11px] text-white/30">{url}</p>
            <p className="mt-2 text-xs text-white/20">Read-only · no score entry</p>
          </div>
        </div>
      )}
    </>
  );
}
