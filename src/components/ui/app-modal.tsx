"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface AppModalProps {
  open: boolean;
  onClose: () => void;
  /** Width class, e.g. "max-w-xl" or "max-w-2xl". Default: "max-w-2xl" */
  maxWidth?: string;
  children: React.ReactNode;
}

/**
 * Shared base modal. Handles:
 *  - Framer Motion backdrop + panel animations
 *  - Escape key
 *  - Body scroll lock
 *  - Click-outside to close
 *  - Focus trap (first focusable child)
 */
export function AppModal({ open, onClose, maxWidth = "max-w-2xl", children }: AppModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  /* Scroll lock */
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  /* Escape key */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* Auto-focus first interactive element */
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea, button:not([disabled])'
      );
      el?.focus();
    }, 120);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            className={`relative z-10 flex w-full flex-col ${maxWidth} overflow-hidden rounded-2xl border border-white/[0.09] shadow-[0_32px_80px_rgba(0,0,0,0.5)]`}
            style={{ background: "#131f16", maxHeight: "min(90vh, 780px)" }}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.25, ease }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

export function ModalHeader({
  icon,
  title,
  subtitle,
  onClose,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-6 py-5">
      {icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-lime/12">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-[15px] font-black text-white leading-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-white/35">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/25 transition-colors hover:bg-white/8 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ModalBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex-1 overflow-y-auto px-6 py-5 ${className}`}>
      {children}
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] px-6 py-4">
      {children}
    </div>
  );
}
