"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Alert } from "@/components/ui";
import { Spinner } from "@/components/ui";
import { BookOpen, CheckCircle } from "lucide-react";

export default function CETermsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/ce/my-training";

  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);

    try {
      const res = await fetch("/api/ce/auth/accept-terms", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          // Not logged in — just navigate, login page will handle
          router.push(`/ce/login?redirect=${encodeURIComponent(redirectTo)}`);
          return;
        }
        setError(data.error || "Failed to record acceptance. Please try again.");
        return;
      }

      router.push(redirectTo);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-red-700" />
            <span className="font-bold text-lg">MedicForge CE</span>
          </div>
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-muted-foreground mt-2">
            Please read and accept before using MedicForge CE.
          </p>
        </div>

        {/* Terms Content */}
        <div className="bg-white rounded-lg border p-8 space-y-6 text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
          <div>
            <h2 className="font-semibold text-base mb-2">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By accessing and using MedicForge Continuing Education (CE), a service of Summers Digital LLC,
              you agree to be bound by these Terms of Service and all applicable laws and regulations.
              If you do not agree with any of these terms, you are prohibited from using or accessing this platform.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">2. Description of Service</h2>
            <p className="text-gray-700">
              MedicForge CE provides online continuing education courses for emergency medical services (EMS)
              providers. Courses are designed to meet the requirements for NREMT recertification and continuing
              competency. We are an approved CE provider in Pennsylvania and states that recognize approved providers.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">3. Eligibility</h2>
            <p className="text-gray-700">
              You must be at least 18 years of age to use this service. By using MedicForge CE, you represent and
              warrant that you are 18 or older and that you are a licensed or certified EMS provider, student, or
              otherwise authorized professional seeking continuing education.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">4. Account Responsibilities</h2>
            <p className="text-gray-700">
              You are responsible for maintaining the confidentiality of your account credentials. All course
              completions are recorded under your account and associated with your NREMT ID (if provided).
              You must provide accurate information, including your name and NREMT ID, as certificates are
              issued based on the information in your profile.
            </p>
            <p className="text-gray-700 mt-2">
              You may not share your account with others or allow others to complete courses on your behalf.
              Such actions may result in account termination and invalidation of certificates.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">5. Course Content and Certificates</h2>
            <p className="text-gray-700">
              Course content is provided for educational purposes only and does not constitute medical advice.
              Certificates are issued upon successful completion of courses, including passing assessments at
              the required minimum score. Certificates are non-transferable and represent the individual
              provider&apos;s personal completion.
            </p>
            <p className="text-gray-700 mt-2">
              MedicForge CE makes no guarantees that completions will be accepted by any specific state EMS
              office or employer. You are responsible for verifying CE acceptance requirements with your
              certifying or licensing body.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">6. Payment and Refunds</h2>
            <p className="text-gray-700">
              Individual course purchases and subscription fees are processed through Square. Subscriptions
              renew automatically unless cancelled. Refund requests must be submitted within 7 days of purchase
              and prior to completing the course. Completed courses are non-refundable.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">7. Intellectual Property</h2>
            <p className="text-gray-700">
              All course content, materials, assessments, and platform features are owned by Summers Digital LLC
              or its licensors. You may not reproduce, distribute, or create derivative works from any content
              without written permission.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">8. Privacy</h2>
            <p className="text-gray-700">
              Your use of MedicForge CE is also governed by our{" "}
              <Link href="/ce/privacy" className="text-red-700 hover:underline">
                Privacy Policy
              </Link>
              , which is incorporated into these Terms by reference. By accepting these Terms, you also
              consent to the collection and use of your information as described in the Privacy Policy.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">9. Limitation of Liability</h2>
            <p className="text-gray-700">
              To the maximum extent permitted by law, Summers Digital LLC shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of MedicForge CE.
              Our total liability for any claim shall not exceed the amount you paid us in the twelve months
              preceding the claim.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">10. Changes to Terms</h2>
            <p className="text-gray-700">
              We reserve the right to modify these Terms at any time. We will notify you of significant changes
              via email or a prominent notice on the platform. Continued use of MedicForge CE after changes
              constitutes acceptance of the new Terms.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">11. Governing Law</h2>
            <p className="text-gray-700">
              These Terms are governed by the laws of the Commonwealth of Pennsylvania, without regard to
              conflict of law provisions. Any disputes shall be resolved in the courts of Pennsylvania.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-base mb-2">12. Contact</h2>
            <p className="text-gray-700">
              For questions about these Terms, contact us at{" "}
              <a href="mailto:ce@medicforge.net" className="text-red-700 hover:underline">
                ce@medicforge.net
              </a>
              .
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Summers Digital LLC | Last updated: March 2026
            </p>
          </div>
        </div>

        {/* Accept Section */}
        <div className="mt-6 bg-white rounded-lg border p-6">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-700">
              By clicking &quot;Accept &amp; Continue&quot;, you confirm that you have read and agree to the
              Terms of Service and Privacy Policy, and that all information in your profile is accurate.
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/ce/login" className="flex-1">
              <Button variant="outline" className="w-full">
                Decline
              </Button>
            </Link>
            <Button className="flex-1" onClick={handleAccept} disabled={isAccepting}>
              {isAccepting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" />
                  Accepting...
                </span>
              ) : (
                "Accept & Continue"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
