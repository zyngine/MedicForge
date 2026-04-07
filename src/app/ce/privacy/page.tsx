import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function CEPrivacyPage() {
  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-red-700" />
            <span className="font-bold text-lg">MedicForge CE</span>
          </div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2 text-sm">Last updated: March 2026</p>
        </div>

        <div className="bg-card rounded-lg border p-8 space-y-6 text-sm leading-relaxed">
          <div>
            <h2 className="font-semibold text-base mb-2">1. Information We Collect</h2>
            <p className="text-foreground">
              MedicForge CE, operated by Summers Digital LLC, collects the following information:
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1 text-foreground">
              <li>Account information: name, email address, password (hashed)</li>
              <li>Professional information: NREMT ID, certification level, state of practice</li>
              <li>Course activity: enrollment records, progress, quiz attempts, completion dates</li>
              <li>Payment information: processed by Square (we do not store card numbers)</li>
              <li>Usage data: pages visited, time spent in courses, browser type</li>
              <li>Communications: messages sent through our contact form or support channels</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">2. How We Use Your Information</h2>
            <p className="text-foreground">We use collected information to:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1 text-foreground">
              <li>Deliver continuing education courses and track your progress</li>
              <li>Issue verified CE certificates associated with your name and NREMT ID</li>
              <li>Fulfill reporting obligations (when applicable, including future NREMT reporting through CAPCE)</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send course completion confirmations, certificates, and assignment notifications</li>
              <li>Improve our platform and content quality</li>
              <li>Comply with legal obligations</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">3. Information Sharing</h2>
            <p className="text-foreground">We do not sell your personal information. We may share information with:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1 text-foreground">
              <li>
                <strong>Your Agency:</strong> If you registered through an agency, your completion records
                and compliance status are visible to your agency administrator.
              </li>
              <li>
                <strong>NREMT/CAPCE:</strong> Upon CAPCE accreditation, completion data (name, NREMT ID,
                course number, CEH hours, completion date) will be reported to NREMT as required.
              </li>
              <li>
                <strong>Service Providers:</strong> Supabase (database hosting), Square (payments),
                Resend (email delivery). These providers are contractually bound to protect your information.
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, court order, or government request.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">4. Data Security</h2>
            <p className="text-foreground">
              We implement industry-standard security measures including encrypted connections (HTTPS),
              hashed passwords, and row-level security on our database. No system is 100% secure;
              you use this service at your own risk.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">5. Data Retention</h2>
            <p className="text-foreground">
              We retain your account data for as long as your account is active plus 7 years to comply
              with CAPCE record retention requirements. Certificate records are retained permanently
              as they serve as proof of completion. You may request deletion of non-essential data
              by contacting us.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">6. Your Rights</h2>
            <p className="text-foreground">You have the right to:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1 text-foreground">
              <li>Access and download your personal data and CE transcripts</li>
              <li>Correct inaccurate information in your profile</li>
              <li>Request deletion of your account (subject to retention requirements)</li>
              <li>Opt out of non-essential marketing emails</li>
            </ul>
            <p className="text-foreground mt-2">
              To exercise these rights, contact{" "}
              <a href="mailto:privacy@medicforge.net" className="text-red-700 hover:underline">
                privacy@medicforge.net
              </a>
              .
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">7. Cookies</h2>
            <p className="text-foreground">
              We use essential cookies for authentication and session management. We do not use
              advertising or tracking cookies. You can disable cookies in your browser, but this
              will prevent you from logging in.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">8. Contact</h2>
            <p className="text-foreground">
              Questions about this Privacy Policy:{" "}
              <a href="mailto:privacy@medicforge.net" className="text-red-700 hover:underline">
                privacy@medicforge.net
              </a>
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              Summers Digital LLC | Pennsylvania, USA
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/ce/terms" className="text-sm text-red-700 hover:underline">
            ← Back to Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
