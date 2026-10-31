"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface LegalModalProps {
  type: "privacy" | "terms";
  onClose: () => void;
}

const PRIVACY_CONTENT = (
  <div className="space-y-8 text-sm text-white/70 leading-relaxed">
    <section>
      <h2 className="mb-3 text-base font-bold text-white">1. Who We Are</h2>
      <p>FreakingBall is a pickleball club management platform. When we say "club admin," we mean the person who registered a club. When we say "member," we mean a person added by a club admin.</p>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">2. What Data We Collect</h2>
      <h3 className="mb-2 font-semibold text-white/90">Club Admins</h3>
      <ul className="mb-4 list-disc pl-5 space-y-1">
        <li>Full name, email address, password (encrypted)</li>
        <li>Club name, location, contact phone (optional)</li>
      </ul>
      <h3 className="mb-2 font-semibold text-white/90">Club Members</h3>
      <ul className="mb-4 list-disc pl-5 space-y-1">
        <li>Full name (required), nickname, phone, gender, profile photo (optional)</li>
      </ul>
      <h3 className="mb-2 font-semibold text-white/90">Activity Data</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Match results, tournament participation, player statistics</li>
      </ul>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">3. How We Use Your Data</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>To provide and operate the FreakingBall platform</li>
        <li>To manage club registrations and approvals</li>
        <li>To display player statistics and match history within your club</li>
        <li>To contact club admins about their account</li>
      </ul>
      <p className="mt-3">We do not sell your data or use it for advertising.</p>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">4. Club Admin Responsibilities</h2>
      <p className="mb-3">By adding a member, the club admin confirms that:</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>The member has been informed their data will be stored on FreakingBall</li>
        <li>The member has consented to having their name, photo, and game data recorded</li>
        <li>The club admin will honor member requests to remove their data</li>
      </ul>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">5. Data Storage</h2>
      <p>All data is stored securely using Supabase with industry-standard encryption. Authentication is handled by Supabase Auth.</p>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">6. Public Information</h2>
      <p>Open play sessions may have a public live view via QR code showing player names and scores. Club admins control whether to share this link.</p>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">7. Your Rights</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>Request access, correction, or deletion of your data</li>
        <li>Members should contact their club admin. Club admins may contact us directly.</li>
      </ul>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">8. Contact</h2>
      <p>For privacy questions: <a href="mailto:freakingballv1@gmail.com" className="text-brand-lime hover:underline">freakingballv1@gmail.com</a></p>
    </section>
  </div>
);

const TERMS_CONTENT = (
  <div className="space-y-8 text-sm text-white/70 leading-relaxed">
    <section>
      <h2 className="mb-3 text-base font-bold text-white">1. Acceptance of Terms</h2>
      <p>By registering a club or using FreakingBall, you agree to these Terms. If you do not agree, do not use the platform.</p>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">2. Club Admin Accounts</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>One admin account per club</li>
        <li>You are responsible for all activity under your account</li>
        <li>You must obtain consent from members before adding their data</li>
      </ul>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">3. Club Registration</h2>
      <p>Registrations are subject to approval. We reserve the right to approve or reject any registration and may revoke access for violations of these terms.</p>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">4. Member Data</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>Only add members who have consented</li>
        <li>Promptly remove or correct member data upon request</li>
        <li>You are responsible for compliance with local data privacy laws (e.g., Philippines Data Privacy Act of 2012)</li>
      </ul>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">5. Acceptable Use</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>No unlawful use or unauthorized access to other clubs&apos; data</li>
        <li>No offensive content, misrepresentation, or harassment</li>
      </ul>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">6. Service Availability</h2>
      <p>We aim for uptime but do not guarantee uninterrupted access. We are not liable for losses from service unavailability.</p>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">7. Limitation of Liability</h2>
      <p>FreakingBall is provided "as is." To the maximum extent permitted by law, we are not liable for indirect or consequential damages.</p>
    </section>
    <section>
      <h2 className="mb-3 text-base font-bold text-white">8. Contact</h2>
      <p>For questions: <a href="mailto:freakingballv1@gmail.com" className="text-brand-lime hover:underline">freakingballv1@gmail.com</a></p>
    </section>
  </div>
);

export function LegalModal({ type, onClose }: LegalModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[80vh] flex flex-col rounded-2xl bg-[#0d1810] border border-white/10 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-black text-white">
            {type === "privacy" ? "Privacy Policy" : "Terms of Service"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          {type === "privacy" ? PRIVACY_CONTENT : TERMS_CONTENT}
          <p className="mt-6 text-xs text-white/30">Last updated: November 1, 2026</p>
        </div>
      </div>
    </div>
  );
}
