"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  UserX,
  UserRound,
  User,
  Phone,
  Edit3,
  Plus,
  Search,
} from "lucide-react";
import { DeleteMemberButton } from "@/components/club/delete-member-button";
import { MemberFormModal, type MemberModalValues } from "@/components/club/member-form-modal";
import Link from "next/link";

/* ─── Types ──────────────────────────────────────────────── */
export interface MemberRow {
  id: string;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  gender: string;
  is_active: boolean;
  photo_url: string | null;
}

export interface MemberStats {
  total: number;
  active: number;
  inactive: number;
  guests: number;
}

interface MembersListClientProps {
  members: MemberRow[];
  stats: MemberStats;
  isGuests: boolean;
  searchQuery: string;
  clubId: string;
}

/* ─── Shared ease ─────────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/* ─── Avatar ─────────────────────────────────────────────── */
function MemberAvatar({ member, size = 40 }: { member: MemberRow; size?: number }) {
  const initials = member.full_name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const s = `${size}px`;
  if (member.photo_url) {
    return (
      <div className="shrink-0 overflow-hidden rounded-full border border-white/10" style={{ width: s, height: s }}>
        <img src={member.photo_url} alt={member.full_name} className="h-full w-full object-cover" />
      </div>
    );
  }
  const isMale = member.gender === "male";
  const isFemale = member.gender === "female";
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-white/8 text-sm font-bold"
      style={{
        width: s, height: s,
        background: isMale ? "rgba(96,165,250,0.12)" : isFemale ? "rgba(244,114,182,0.12)" : "rgba(255,255,255,0.06)",
        color: isMale ? "#60a5fa" : isFemale ? "#f472b4" : "rgba(255,255,255,0.5)",
      }}
    >
      {initials}
    </div>
  );
}

/* ─── Gender badge ────────────────────────────────────────── */
function GenderBadge({ gender }: { gender: string }) {
  const cfg = ({
    male:   { label: "Male",   color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
    female: { label: "Female", color: "#f472b4", bg: "rgba(244,114,182,0.1)" },
    other:  { label: "Other",  color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)" },
  } as Record<string, { label: string; color: string; bg: string }>)[gender]
    ?? { label: gender, color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.06)" };
  return (
    <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium capitalize"
      style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
  );
}

/* ─── Status badge ────────────────────────────────────────── */
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        background: active ? "rgba(183,255,114,0.1)" : "rgba(255,255,255,0.05)",
        color: active ? "#b7ff72" : "rgba(255,255,255,0.3)",
        border: `1px solid ${active ? "rgba(183,255,114,0.2)" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? "#b7ff72" : "rgba(255,255,255,0.2)" }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* ─── Stat card ─────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, accentHex, delay }: {
  icon: React.ElementType; label: string; value: number; accentHex: string; delay: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease }}>
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] p-4"
        style={{ background: "rgba(255,255,255,0.035)" }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accentHex}18` }}>
          <Icon className="h-4 w-4" style={{ color: accentHex }} />
        </div>
        <div>
          <p className="text-xl font-black leading-none" style={{ color: accentHex }}>{value}</p>
          <p className="mt-0.5 text-[11px] text-white/35">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Empty state ─────────────────────────────────────────── */
function EmptyState({ isGuests, searchQuery, onAdd }: {
  isGuests: boolean; searchQuery: string; onAdd: () => void;
}) {
  const hasSearch = !!searchQuery;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.07] py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07]"
        style={{ background: "rgba(255,255,255,0.04)" }}>
        <Users className="h-6 w-6 text-white/15" />
      </div>
      <p className="font-semibold text-white/35">
        {hasSearch ? "No results found" : isGuests ? "No guests yet" : "No members yet"}
      </p>
      <p className="mt-1.5 max-w-[220px] text-sm text-white/20">
        {hasSearch ? `No ${isGuests ? "guests" : "members"} match "${searchQuery}"`
          : isGuests ? "Guests can join sessions without being members"
          : "Add your first member to get started"}
      </p>
      {!hasSearch && (
        <button onClick={onAdd}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-lime px-4 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-brand-lime/90">
          <Plus className="h-4 w-4" />
          Add {isGuests ? "Guest" : "Member"}
        </button>
      )}
    </motion.div>
  );
}

/* ─── Main exported component ─────────────────────────────── */
export function MembersListClient({ members, stats, isGuests, searchQuery, clubId }: MembersListClientProps) {
  const pathname = usePathname();
  const router = useRouter();

  /* Modal state */
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MemberModalValues | null>(null);

  /* Client-side search (supplements server search) */
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const tabs = [
    { label: "Members", value: undefined as string | undefined, count: stats.total },
    { label: "Guests",  value: "guests",                        count: stats.guests },
  ];

  function openEdit(m: MemberRow) {
    setEditTarget({
      id:        m.id,
      full_name: m.full_name,
      nickname:  m.nickname,
      phone:     m.phone,
      gender:    m.gender as "male" | "female" | "other",
      is_active: m.is_active,
      photo_url: m.photo_url,
      is_guest:  isGuests,
    });
  }

  return (
    <>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-lime/12">
              <Users className="h-5 w-5 text-brand-lime" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-tight">
                {isGuests ? "Guest Players" : "Club Members"}
              </h1>
              <p className="text-xs text-white/35">
                {isGuests ? "Manage your club's guests" : "Manage your club community"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-brand-lime px-4 py-2.5 text-sm font-semibold text-brand-dark transition-all hover:bg-brand-lime/90 hover:shadow-[0_0_20px_rgba(183,255,114,0.2)] sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Add {isGuests ? "Guest" : "Member"}
          </button>
        </motion.div>

        {/* ── Stats row ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Users}     label="Total Members" value={stats.total}    accentHex="#b7ff72" delay={0.05} />
          <StatCard icon={UserCheck} label="Active"        value={stats.active}   accentHex="#60a5fa" delay={0.09} />
          <StatCard icon={UserX}     label="Inactive"      value={stats.inactive} accentHex="#f87171" delay={0.13} />
          <StatCard icon={User}      label="Guests"        value={stats.guests}   accentHex="#a78bfa" delay={0.17} />
        </div>

        {/* ── Tabs + search ───────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.1, ease }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center">

          {/* Segmented control */}
          <div className="flex shrink-0 overflow-hidden rounded-xl border border-white/[0.07] p-1"
            style={{ background: "rgba(255,255,255,0.03)" }}>
            {tabs.map((t) => {
              const active = t.value === undefined ? !isGuests : isGuests;
              return (
                <Link
                  key={t.label}
                  href={t.value ? `/club/members?tab=${t.value}` : "/club/members"}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200"
                  style={{
                    background: active ? "#b7ff72" : "transparent",
                    color: active ? "#18251D" : "rgba(255,255,255,0.35)",
                  }}
                >
                  {t.label}
                  <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      background: active ? "rgba(24,37,29,0.2)" : "rgba(255,255,255,0.08)",
                      color: active ? "#18251D" : "rgba(255,255,255,0.4)",
                    }}>
                    {t.count}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Search (client-side for instant response, form for URL-driven) */}
          <form className="flex-1" action={pathname}>
            {isGuests && <input type="hidden" name="tab" value="guests" />}
            <div
              className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] px-3.5 transition-all duration-150 focus-within:border-brand-lime/40 focus-within:shadow-[0_0_0_3px_rgba(183,255,114,0.06)]"
              style={{ height: "40px", background: "rgba(255,255,255,0.04)" }}
            >
              <Search className="h-4 w-4 shrink-0 text-white/20" />
              <input
                name="q"
                type="search"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by name or nickname…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
              />
            </div>
          </form>
        </motion.div>

        {/* ── Member list ─────────────────────────────────── */}
        {members.length === 0 ? (
          <EmptyState isGuests={isGuests} searchQuery={searchQuery} onAdd={() => setAddOpen(true)} />
        ) : (
          <div className="space-y-1.5">
            {members.map((m, i) => (
              <motion.div key={m.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.15 + i * 0.04, ease }}>
                <div
                  className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] px-4 py-3.5 transition-all duration-200 hover:-translate-y-[1px] hover:border-white/[0.12] hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                  style={{ background: "rgba(255,255,255,0.035)" }}
                >
                  <MemberAvatar member={m} size={42} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white/90 leading-tight">{m.full_name}</p>
                      {m.nickname && <span className="text-xs text-white/30">&ldquo;{m.nickname}&rdquo;</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <GenderBadge gender={m.gender} />
                      {m.phone && (
                        <span className="flex items-center gap-1 text-[11px] text-white/25">
                          <Phone className="h-3 w-3" />{m.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:block">
                    <StatusBadge active={m.is_active} />
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => openEdit(m)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/25 transition-all duration-150 hover:bg-white/8 hover:text-white"
                      title="Edit member"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <DeleteMemberButton memberId={m.id} memberName={m.full_name} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {members.length > 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-center text-xs text-white/20">
            {members.length} {isGuests ? "guest" : "member"}{members.length !== 1 ? "s" : ""}
            {searchQuery ? ` matching "${searchQuery}"` : ""}
          </motion.p>
        )}
      </div>

      {/* ── Add modal ──────────────────────────────────────── */}
      <MemberFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        clubId={clubId}
        isGuest={isGuests}
      />

      {/* ── Edit modal ─────────────────────────────────────── */}
      <MemberFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        clubId={clubId}
        defaultValues={editTarget ?? undefined}
      />
    </>
  );
}
