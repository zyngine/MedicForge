import { MarketingLayout } from "@/components/layouts";
import { Badge } from "@/components/ui";

export default function TermsPage() {
  return (
    <MarketingLayout>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              Legal
            </Badge>
            <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
            <p className="text-muted-foreground mb-8">
              Last updated: January 2025
            </p>

            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground mb-4">
                By accessing or using MedicForge, you agree to be bound by these Terms of
                Service. If you do not agree to these terms, please do not use our services.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground mb-4">
                MedicForge is a learning management system designed for EMS education.
                We provide tools for course management, competency tracking, grading,
                and communication between instructors and students.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">3. User Accounts</h2>
              <p className="text-muted-foreground mb-4">
                You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Ensuring your account information is accurate and current</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">4. Acceptable Use</h2>
              <p className="text-muted-foreground mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Upload malicious code or interfere with the service</li>
                <li>Attempt to gain unauthorized access to any systems</li>
                <li>Use the service for any unlawful purpose</li>
                <li>Share your account with unauthorized users</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">5. Content Ownership</h2>
              <p className="text-muted-foreground mb-4">
                You retain ownership of content you upload to MedicForge. By uploading
                content, you grant us a license to use, store, and display that content
                as necessary to provide our services.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">6. Subscription and Payment</h2>
              <p className="text-muted-foreground mb-4">
                Paid plans are billed in advance on a monthly or annual basis.
                Subscriptions automatically renew unless cancelled. Refunds are handled
                on a case-by-case basis.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">7. Termination</h2>
              <p className="text-muted-foreground mb-4">
                We may suspend or terminate your access to the service at any time for
                violation of these terms. You may cancel your account at any time through
                your account settings.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">8. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground mb-4">
                The service is provided &quot;as is&quot; without warranties of any kind. We do
                not guarantee that the service will be uninterrupted, secure, or error-free.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">9. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-4">
                To the maximum extent permitted by law, MedicForge shall not be liable
                for any indirect, incidental, special, consequential, or punitive damages
                arising from your use of the service.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to Terms</h2>
              <p className="text-muted-foreground mb-4">
                We may update these terms from time to time. We will notify you of
                significant changes via email or through the service. Continued use
                after changes constitutes acceptance of the new terms.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact</h2>
              <p className="text-muted-foreground mb-4">
                For questions about these Terms of Service, contact us at:
              </p>
              <p className="text-muted-foreground">
                Email: admin@medicforge.com
              </p>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
