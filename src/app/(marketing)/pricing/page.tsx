import Link from "next/link";
import { MarketingLayout } from "@/components/layouts";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { CheckCircle, HelpCircle } from "lucide-react";

const pricingTiers = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for small programs getting started",
    features: [
      "1 instructor account",
      "Up to 25 students",
      "2 active courses",
      "Basic assignment types",
      "Quiz auto-grading",
      "1GB storage",
      "Community support",
      "MedicForge branding",
    ],
    limitations: [
      "No custom domain",
      "No NREMT tracking",
      "Limited analytics",
    ],
    cta: "Get Started Free",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "For growing training programs",
    features: [
      "Up to 5 instructors",
      "Up to 100 students",
      "Unlimited courses",
      "All assignment types",
      "Full NREMT competency tracking",
      "Clinical hours logging",
      "Curve grading options",
      "25GB storage",
      "Email support",
      "Custom subdomain",
      "Remove MedicForge branding",
      "Advanced analytics",
    ],
    limitations: [],
    cta: "Start Free Trial",
    href: "/register?plan=professional",
    highlighted: true,
  },
  {
    name: "Institution",
    price: "$299",
    period: "/month",
    description: "For colleges and large academies",
    features: [
      "Unlimited instructors",
      "Up to 500 students",
      "Everything in Professional",
      "100GB storage",
      "Custom domain support",
      "API access",
      "Priority support",
      "White-label option",
      "Advanced reporting",
      "SSO integration",
      "Dedicated account manager",
    ],
    limitations: [],
    cta: "Contact Sales",
    href: "/contact?plan=institution",
    highlighted: false,
  },
];

const faqs = [
  {
    question: "Can I try MedicForge before committing?",
    answer:
      "Yes! All paid plans come with a 14-day free trial. No credit card required to start. You can also use our free Starter plan indefinitely.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express) and can arrange invoicing for Institution plans.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time. When upgrading, you'll be prorated for the remainder of your billing cycle.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "Your data remains accessible for 30 days after cancellation. You can export all your data during this period. After 30 days, data is permanently deleted.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer:
      "Yes! Annual plans receive a 20% discount. Contact us for multi-year agreements with additional savings.",
  },
  {
    question: "Is there a limit on file uploads?",
    answer:
      "Individual file uploads are limited to 100MB. Your total storage depends on your plan (1GB for Starter, 25GB for Professional, 100GB for Institution).",
  },
];

export default function PricingPage() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground">
              Start free and scale as your program grows. No hidden fees, no surprises.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <Card
                key={index}
                className={`relative ${
                  tier.highlighted ? "border-primary shadow-lg scale-105" : ""
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">{tier.price}</span>
                      {tier.period && (
                        <span className="text-muted-foreground">{tier.period}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {tier.description}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {tier.limitations.length > 0 && (
                    <ul className="space-y-2 mb-6 pt-4 border-t">
                      {tier.limitations.map((limitation, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="shrink-0">—</span>
                          {limitation}
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button
                    className="w-full"
                    variant={tier.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <Link href={tier.href}>{tier.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto bg-muted/50">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Need More?</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                For large institutions with 500+ students, custom integrations, or
                special requirements, we offer tailored Enterprise plans with
                dedicated support and custom pricing.
              </p>
              <Button size="lg" asChild>
                <Link href="/contact?plan=enterprise">Contact Sales</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              FAQ
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex gap-3">
                    <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-2">{faq.question}</h4>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
