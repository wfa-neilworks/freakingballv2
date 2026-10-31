import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-brand-dark px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Link href="/login" className="text-sm text-brand-lime hover:underline">
            ← Back to Login
          </Link>
        </div>

        <h1 className="mb-2 text-3xl font-black text-white">Terms of Service</h1>
        <p className="mb-8 text-sm text-white/40">Last updated: November 1, 2026</p>

        <div className="space-y-8 text-sm text-white/70 leading-relaxed">
          <section>
            <h2 className="mb-3 text-base font-bold text-white">1. Acceptance of Terms</h2>
            <p>
              By registering a club or using FreakingBall, you agree to these Terms of Service.
              If you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">2. Club Admin Accounts</h2>
            <p className="mb-3">
              FreakingBall is a tool for pickleball club administrators. Only one admin account
              is permitted per club. As a club admin, you are responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Keeping your login credentials secure</li>
              <li>All activity that occurs under your account</li>
              <li>Ensuring the accuracy of club and member information you enter</li>
              <li>Obtaining consent from members before adding their data</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">3. Club Registration</h2>
            <p>
              Club registrations are subject to approval by the FreakingBall team. We reserve
              the right to approve or reject any registration at our discretion. Approved clubs
              may have their access revoked if they violate these terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">4. Member Data</h2>
            <p className="mb-3">Club admins agree that:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                They will only add members who have consented to having their data stored on the
                platform
              </li>
              <li>They will not add false or misleading information about members</li>
              <li>
                They will promptly remove or correct member data upon request from the member
              </li>
              <li>
                They are responsible for any data privacy obligations under local laws (e.g.,
                Philippines Data Privacy Act of 2012) that apply to their club
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">5. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use the platform for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to other clubs&apos; data</li>
              <li>Upload offensive, harmful, or inappropriate content</li>
              <li>Misrepresent your identity or your club</li>
              <li>Use the platform to harass or harm any individual</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">6. Intellectual Property</h2>
            <p>
              FreakingBall and its original content, features, and functionality are owned by
              the platform operators. You retain ownership of any data you input (club info,
              member data). You grant FreakingBall a limited license to store and display that
              data to operate the service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">7. Service Availability</h2>
            <p>
              We aim to keep FreakingBall available at all times but do not guarantee
              uninterrupted access. We may perform maintenance, updates, or experience downtime.
              We are not liable for any losses resulting from service unavailability.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">8. Limitation of Liability</h2>
            <p>
              FreakingBall is provided "as is" without warranties of any kind. To the maximum
              extent permitted by law, we are not liable for any indirect, incidental, or
              consequential damages arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate any account that violates these
              terms. You may also delete your account at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">10. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the platform after
              changes are posted constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-bold text-white">11. Contact</h2>
            <p>
              For questions about these terms, contact us at{" "}
              <a href="mailto:neil.john.salvadora@gmail.com" className="text-brand-lime hover:underline">
                neil.john.salvadora@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <Link href="/privacy" className="text-sm text-brand-lime hover:underline">
            View Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
