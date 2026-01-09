import { MarketingLayout } from "@/components/layouts";
import { Badge, Card, CardContent } from "@/components/ui";
import { Shield, Lock, Eye, Server, CheckCircle, FileCheck } from "lucide-react";

const securityFeatures = [
  {
    icon: <Lock className="h-6 w-6" />,
    title: "Encryption",
    description:
      "All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Access Control",
    description:
      "Role-based access control ensures users only see data they're authorized to access.",
  },
  {
    icon: <Eye className="h-6 w-6" />,
    title: "Audit Logging",
    description:
      "Comprehensive audit logs track all system access and changes for accountability.",
  },
  {
    icon: <Server className="h-6 w-6" />,
    title: "Secure Infrastructure",
    description:
      "Hosted on enterprise-grade cloud infrastructure with 99.9% uptime SLA.",
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    title: "Regular Assessments",
    description:
      "We conduct regular security assessments and penetration testing.",
  },
  {
    icon: <FileCheck className="h-6 w-6" />,
    title: "FERPA Compliant",
    description:
      "Our platform is designed to meet FERPA requirements for educational data protection.",
  },
];

export default function SecurityPage() {
  return (
    <MarketingLayout>
      <section className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Security
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Your Data is Safe with Us
            </h1>
            <p className="text-xl text-muted-foreground">
              Security is at the core of everything we build. We implement
              industry-leading practices to protect your data.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {securityFeatures.map((feature, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Security Practices
            </h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold mb-3">Data Protection</h3>
                <p className="text-muted-foreground">
                  We use industry-standard encryption protocols to protect your data
                  both in transit and at rest. All connections use TLS 1.3, and stored
                  data is encrypted using AES-256.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Infrastructure Security</h3>
                <p className="text-muted-foreground">
                  MedicForge is hosted on secure cloud infrastructure with multiple
                  layers of protection including firewalls, intrusion detection, and
                  DDoS mitigation. We maintain SOC 2 Type II compliance.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Access Management</h3>
                <p className="text-muted-foreground">
                  We implement strict access controls following the principle of least
                  privilege. Multi-factor authentication is available for all accounts,
                  and we support SSO for enterprise customers.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Incident Response</h3>
                <p className="text-muted-foreground">
                  We have a comprehensive incident response plan in place. In the event
                  of a security incident, affected customers will be notified promptly
                  in accordance with applicable laws.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Report a Vulnerability</h3>
                <p className="text-muted-foreground">
                  If you discover a security vulnerability, please report it to
                  admin@medicforge.com. We appreciate responsible disclosure and will
                  work with you to address any issues.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
