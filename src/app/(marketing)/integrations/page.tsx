import Link from "next/link";
import { MarketingLayout } from "@/components/layouts";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { Video, Calendar, CreditCard, Mail, FileText, Zap } from "lucide-react";

const integrations = [
  {
    icon: <Video className="h-8 w-8" />,
    title: "Video Platforms",
    description: "Embed videos from YouTube, Vimeo, and other popular platforms.",
    status: "Available",
  },
  {
    icon: <Calendar className="h-8 w-8" />,
    title: "Calendar Sync",
    description: "Sync events with Google Calendar and Apple Calendar.",
    status: "Available",
  },
  {
    icon: <CreditCard className="h-8 w-8" />,
    title: "Square Payments",
    description: "Secure payment processing for CE courses and subscriptions via Square.",
    status: "Available",
  },
  {
    icon: <Mail className="h-8 w-8" />,
    title: "Email Notifications",
    description: "Automated email notifications for assignments, grades, and more.",
    status: "Available",
  },
  {
    icon: <FileText className="h-8 w-8" />,
    title: "Document Viewing",
    description: "Built-in viewer for PDFs and common document formats.",
    status: "Available",
  },
  {
    icon: <Zap className="h-8 w-8" />,
    title: "API Access",
    description: "RESTful API for custom integrations (Institution plan).",
    status: "Available",
  },
];

export default function IntegrationsPage() {
  return (
    <MarketingLayout>
      <section className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Integrations
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Connect Your Tools
            </h1>
            <p className="text-xl text-muted-foreground">
              MedicForge integrates with the tools you already use to create
              a seamless experience.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {integrations.map((integration, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      {integration.icon}
                    </div>
                    <Badge variant="secondary">{integration.status}</Badge>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{integration.title}</h3>
                  <p className="text-muted-foreground">{integration.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto bg-muted/50">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">Need a Custom Integration?</h3>
              <p className="text-muted-foreground mb-6">
                Our API allows you to build custom integrations with your existing
                systems. Contact us to learn more.
              </p>
              <Button asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
