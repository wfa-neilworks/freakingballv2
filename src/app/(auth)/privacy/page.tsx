import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-brand-dark px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Link href="/login" className="text-sm text-brand-lime hover:underline">
            ← Back to Login
          </Link>
        </div>

        <h1 className="mb-2 text-3xl font-black text-white">Privacy Policy</h1>
        <p className="mb-8 text-sm text-white/40">Last updated: November 1, 2026</p>

        <div className="space-y-8 text-sm text-white/70 leading-relaxed">
          <section>
            <h2 className="mb-3 text-base font-bold text-white">1. Who We Are</h2>
            <p>
              FreakingBall is a pickleball club management platform operated as a service for
              pickleball clubs and their members. When we say "we," "us," or "FreakingBall," we
              mean the operators of this platform. When we say "club admin," we mean the person
              who registered a club on this platform. When we say "member," we mean a person
              added to a club by a club admin.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">2. What Data We Collect</h2>

            <h3 className="mb-2 font-semibold text-white/90">Club Admins</h3>
            <p className="mb-3">When you register a club, we collect:</p>
            <ul className="mb-4 list-disc pl-5 space-y-1">
              <li>Full name</li>
              <li>Email address and password (password is encrypted)</li>
              <li>Club name and location</li>
              <li>Contact phone number (optional)</li>
            </ul>

            <h3 className="mb-2 font-semibold text-white/90">Club Members</h3>
            <p className="mb-3">
              Club admins may add members to the platform. For each member, the following may
              be collected by the club admin:
            </p>
            <ul className="mb-4 list-disc pl-5 space-y-1">
              <li>Full name (required)</li>
              <li>Nickname (optional)</li>
              <li>Phone number (optional)</li>
              <li>Gender (required)</li>
              <li>Profile photo (optional)</li>
            </ul>

            <h3 className="mb-2 font-semibold text-white/90">Activity Data</h3>
            <p className="mb-3">
              We automatically record activity data when members participate in tournaments or
              open play sessions, including:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Match results (wins, losses, scores)</li>
              <li>Tournament participation and placements</li>
              <li>Player statistics and rankings</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide and operate the FreakingBall platform</li>
              <li>To manage club registrations and approve or reject applications</li>
              <li>To display player statistics, standings, and match history within your club</li>
              <li>To generate QR codes for public live session views</li>
              <li>To contact club admins about their account or application status</li>
            </ul>
            <p className="mt-3">
              We do not sell your data to third parties. We do not use your data for advertising.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">4. Club Admin Responsibilities</h2>
            <p className="mb-3">
              Club admins are responsible for obtaining consent from their members before adding
              member data to FreakingBall. By adding a member to the platform, the club admin
              confirms that:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>The member has been informed that their data will be stored on FreakingBall</li>
              <li>The member has consented to having their name, photo, and game data recorded</li>
              <li>The club admin will honor member requests to remove their data</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">5. Data Storage</h2>
            <p>
              All data is stored securely using Supabase, a third-party database provider with
              industry-standard encryption. Photos and images are stored in Supabase Storage.
              Authentication is handled by Supabase Auth. Data is stored in secure servers and
              protected by access controls.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">6. Public Information</h2>
            <p>
              Open play sessions may have a public live view accessible via a QR code link.
              This view displays player names and match scores. Club admins control whether to
              share this link publicly.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">7. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Request access to the data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>
                Members should contact their club admin to request data changes or removal.
                Club admins may contact us directly.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">8. Data Retention</h2>
            <p>
              We retain your data for as long as your club account is active. If a club account
              is closed, data may be retained for up to 30 days before deletion. You may request
              earlier deletion by contacting us.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">9. Contact</h2>
            <p>
              For privacy-related requests or questions, contact the FreakingBall team at{" "}
              <a href="mailto:neil.john.salvadora@gmail.com" className="text-brand-lime hover:underline">
                neil.john.salvadora@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <Link href="/terms" className="text-sm text-brand-lime hover:underline">
            View Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
