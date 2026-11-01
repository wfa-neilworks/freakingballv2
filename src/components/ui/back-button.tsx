"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const BACK_CLS =
  "group inline-flex items-center gap-2 rounded-xl border border-white/[0.07] px-3 py-2 text-sm font-medium text-white/45 transition-all duration-150 hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white/80 active:scale-[0.97]";
const BACK_STYLE = { background: "rgba(255,255,255,0.025)" } as const;

interface BackButtonProps {
  href?: string;
  label?: string;
}

/** Client component — uses router.back() when no href is given. */
export function BackButton({ href, label = "Back" }: BackButtonProps) {
  const router = useRouter();

  function handleClick() {
    if (href) router.push(href);
    else router.back();
  }

  return (
    <button onClick={handleClick} className={BACK_CLS} style={BACK_STYLE}>
      <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
      {label}
    </button>
  );
}

/** Server-safe link version — use when href is always known at render time. */
export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link href={href} className={BACK_CLS} style={BACK_STYLE}>
      <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
      {label}
    </Link>
  );
}
