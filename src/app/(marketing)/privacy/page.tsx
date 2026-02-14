import { MarketingLayout } from "@/components/layouts";
import { Badge } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              Legal
            </Badge>
            <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">
              Last updated: January 2025
            </p>

            <div className="prose prose-gray max-w-none">
              <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
              <p className="text-muted-foreground mb-4">
                MedicForge (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard
                your information when you use our learning management system.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
              <p className="text-muted-foreground mb-4">
                We collect information you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Account information (name, email, password)</li>
                <li>Profile information (organization, role)</li>
                <li>Educational content and submissions</li>
                <li>Communication data (support requests, feedback)</li>
                <li>Usage data (how you interact with our platform)</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze trends, usage, and activities</li>
                <li>Detect and prevent fraudulent transactions and abuse</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">4. Information Sharing</h2>
              <p className="text-muted-foreground mb-4">
                We do not sell your personal information. We may share information:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>With your consent or at your direction</li>
                <li>With service providers who assist our operations</li>
                <li>To comply with legal obligations</li>
                <li>To protect rights, privacy, safety, or property</li>
                <li>In connection with a merger or acquisition</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Security</h2>
              <p className="text-muted-foreground mb-4">
                We implement appropriate technical and organizational measures to protect
                your personal information, including encryption in transit and at rest,
                access controls, and regular security assessments.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">6. Data Retention</h2>
              <p className="text-muted-foreground mb-4">
                We retain your information for as long as your account is active or as
                needed to provide services. Upon account deletion, we retain certain
                information as required by law or for legitimate business purposes.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Rights</h2>
              <p className="text-muted-foreground mb-4">
                Depending on your location, you may have rights to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Delete your information</li>
                <li>Export your data</li>
                <li>Opt out of certain data uses</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">8. FERPA Compliance</h2>
              <p className="text-muted-foreground mb-4">
                For educational institutions, we comply with the Family Educational Rights
                and Privacy Act (FERPA). Student educational records are protected and
                only shared as permitted by FERPA.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">9. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have questions about this Privacy Policy, please contact us at:
              </p>
              <p className="text-muted-foreground">
                Email: admin@medicforge.net
              </p>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
