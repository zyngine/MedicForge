import Link from "next/link";
import { MarketingLayout } from "@/components/layouts";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import {
  Stethoscope,
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  Users,
  Clock,
  Smartphone,
  CheckCircle,
  ArrowRight,
  Star,
  Play,
} from "lucide-react";

const features = [
  {
    icon: <GraduationCap className="h-6 w-6" />,
    title: "Comprehensive Course Builder",
    description:
      "Create engaging courses with modules, lessons, videos, and documents. Support for EMR, EMT, AEMT, and Paramedic curricula.",
  },
  {
    icon: <ClipboardCheck className="h-6 w-6" />,
    title: "NREMT Competency Tracking",
    description:
      "Track required skills, clinical hours, and patient contacts. Built-in checklists aligned with NREMT requirements.",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Advanced Grading & Analytics",
    description:
      "Auto-grading quizzes, curve grading options (bell, sqrt, linear), and detailed performance analytics.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Multi-Tenant Platform",
    description:
      "Perfect for training academies, colleges, and fire departments. Each institution gets their own branded space.",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Clinical Hours Logging",
    description:
      "Students log hours, instructors verify. Track hospital rotations, ride-alongs, and field experiences.",
  },
  {
    icon: <Smartphone className="h-6 w-6" />,
    title: "Mobile-Ready PWA",
    description:
      "Access courses anywhere. Offline support for reviewing materials without internet connection.",
  },
];

const testimonials = [
  {
    quote:
      "MedicForge transformed how we run our EMT program. The NREMT tracking alone saves us hours every week.",
    author: "Dr. Sarah Johnson",
    role: "Program Director, Metro EMS Academy",
    rating: 5,
  },
  {
    quote:
      "Finally, an LMS that understands EMS education. The skill checklists and clinical hour tracking are exactly what we needed.",
    author: "Chief Mike Rodriguez",
    role: "Training Officer, City Fire Department",
    rating: 5,
  },
  {
    quote:
      "Our pass rates improved significantly after switching to MedicForge. Students love the mobile access.",
    author: "Lisa Chen",
    role: "Lead Instructor, Community College EMS",
    rating: 5,
  },
];

const pricingTiers = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for small programs getting started",
    features: [
      "1 instructor",
      "Up to 25 students",
      "2 active courses",
      "Basic assignment types",
      "1GB storage",
      "Community support",
    ],
    cta: "Get Started Free",
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
      "Full NREMT tracking",
      "25GB storage",
      "Email support",
      "Custom subdomain",
    ],
    cta: "Start Free Trial",
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
      "Custom domain",
      "API access",
      "Priority support",
      "White-label option",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              Built for EMS Education
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Where First Responders
              <span className="text-primary block">Are Forged</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The modern Learning Management System designed specifically for EMS education.
              Train EMRs, EMTs, AEMTs, and Paramedics with our comprehensive platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="xl" asChild>
                <Link href="/register">
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link href="/demo">
                  <Play className="mr-2 h-5 w-5" /> Try Demo
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required. 14-day free trial.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="container mx-auto px-4 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 p-8 bg-card rounded-2xl border shadow-lg">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground mt-1">Training Programs</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">50K+</div>
                <div className="text-sm text-muted-foreground mt-1">Students Trained</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">98%</div>
                <div className="text-sm text-muted-foreground mt-1">NREMT Pass Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">4.9</div>
                <div className="text-sm text-muted-foreground mt-1">Average Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Train EMS Professionals
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Purpose-built tools for EMS education that help you deliver better training
              and track competencies effortlessly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
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

      {/* Course Types Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Course Support</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Built for All EMS Certification Levels
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Pre-built templates and competency tracking for every level of EMS certification.
                Customize to match your state requirements.
              </p>
              <ul className="space-y-4">
                {[
                  { level: "EMR", desc: "Emergency Medical Responder" },
                  { level: "EMT", desc: "Emergency Medical Technician" },
                  { level: "AEMT", desc: "Advanced Emergency Medical Technician" },
                  { level: "Paramedic", desc: "Paramedic Certification" },
                ].map((item) => (
                  <li key={item.level} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <div>
                      <span className="font-semibold">{item.level}</span>
                      <span className="text-muted-foreground"> - {item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                <Stethoscope className="h-24 w-24 text-primary/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by EMS Educators Nationwide
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <blockquote className="text-lg mb-4">&quot;{testimonial.quote}&quot;</blockquote>
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Start free and scale as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <Card
                key={index}
                className={tier.highlighted ? "border-primary shadow-lg relative" : ""}
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
                    <p className="text-sm text-muted-foreground mt-2">{tier.description}</p>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={tier.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/register">{tier.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your EMS Training?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join hundreds of training programs already using MedicForge to educate
            the next generation of first responders.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" variant="secondary" asChild>
              <Link href="/register">
                Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
              <Link href="/contact">Talk to Sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
