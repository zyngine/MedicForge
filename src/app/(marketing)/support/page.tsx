import Link from "next/link";
import { MarketingLayout } from "@/components/layouts";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { Mail, MessageSquare, BookOpen, HelpCircle, FileText, Video } from "lucide-react";

const supportOptions = [
  {
    icon: <Mail className="h-8 w-8" />,
    title: "Email Support",
    description: "Get help via email. We typically respond within 24 hours.",
    action: "Send Email",
    href: "mailto:admin@medicforge.net",
  },
  {
    icon: <BookOpen className="h-8 w-8" />,
    title: "Documentation",
    description: "Browse our comprehensive guides and tutorials.",
    action: "View Docs",
    href: "/docs",
  },
  {
    icon: <HelpCircle className="h-8 w-8" />,
    title: "FAQ",
    description: "Find answers to commonly asked questions.",
    action: "View FAQ",
    href: "/pricing#faq",
  },
];

const resources = [
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Getting Started Guide",
    description: "Learn the basics of setting up your MedicForge account.",
  },
  {
    icon: <Video className="h-6 w-6" />,
    title: "Video Tutorials",
    description: "Watch step-by-step tutorials for common tasks.",
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Best Practices",
    description: "Tips for getting the most out of MedicForge.",
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Community Forum",
    description: "Connect with other MedicForge users.",
  },
];

export default function SupportPage() {
  return (
    <MarketingLayout>
      <section className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Support
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              How Can We Help?
            </h1>
            <p className="text-xl text-muted-foreground">
              We&apos;re here to help you get the most out of MedicForge. Choose
              the support option that works best for you.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {supportOptions.map((option, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    {option.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{option.title}</h3>
                  <p className="text-muted-foreground mb-4">{option.description}</p>
                  <Button asChild>
                    <Link href={option.href}>{option.action}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Resources</h2>
            <p className="text-muted-foreground">
              Explore our library of helpful resources.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {resources.map((resource, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {resource.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{resource.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {resource.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
