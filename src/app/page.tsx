import Link from "next/link";
import { MarketingLayout } from "@/components/layouts";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import {
  Stethoscope,
  GraduationCap,
  Flame,
  ClipboardCheck,
  BarChart3,
  Users,
  Clock,
  Smartphone,
  CheckCircle,
  ArrowRight,
  Star,
  Building2,
  UserCog,
  CalendarClock,
  BookOpen,
  Award,
  Shield,
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

const agencyFeatures = [
  {
    icon: <Building2 className="h-6 w-6" />,
    title: "Employee Roster Management",
    description:
      "Track all agency employees, certifications, and expiration dates with automated alerts.",
  },
  {
    icon: <UserCog className="h-6 w-6" />,
    title: "Medical Director Portal",
    description:
      "Digital signature verification and oversight for competency sign-offs.",
  },
  {
    icon: <CalendarClock className="h-6 w-6" />,
    title: "Verification Cycles",
    description:
      "Create annual or remedial verification periods with progress tracking for each employee.",
  },
  {
    icon: <ClipboardCheck className="h-6 w-6" />,
    title: "State Compliance",
    description:
      "PA state competency library with full audit trail for regulatory compliance.",
  },
];

const ceFeatures = [
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Unlimited CE Courses",
    description:
      "Self-paced online courses covering all NREMT topic categories. Learn on your schedule, 24/7.",
  },
  {
    icon: <Award className="h-6 w-6" />,
    title: "Verified Certificates",
    description:
      "Every completion generates a verifiable certificate with a unique QR code accepted by state EMS offices.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "CAPCE-Ready Content",
    description:
      "Evidence-based, committee-reviewed curriculum built to CAPCE standards. Accreditation coming 2027.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Agency CE Management",
    description:
      "Compliance dashboards, training assignments, and NREMT reporting for your entire department.",
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
    name: "Professional",
    price: "$1,499",
    regularPrice: "$2,499",
    period: "/year",
    description: "For growing training programs",
    features: [
      "Up to 5 instructors",
      "Up to 25 students",
      "Unlimited courses",
      "Full NREMT tracking",
      "25GB storage",
      "Custom subdomain",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Institution",
    price: "$3,999",
    regularPrice: "$4,999",
    period: "/year",
    description: "For colleges and large academies",
    features: [
      "Unlimited instructors",
      "Up to 100 students",
      "Everything in Professional",
      "100GB storage",
      "Custom domain",
      "Priority support",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    regularPrice: "",
    description: "For large institutions with custom needs",
    features: [
      "Unlimited students",
      "Custom integrations",
      "SSO integration",
      "Dedicated account manager",
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
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link href="/login">
                  Sign In
                </Link>
              </Button>
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

      {/* Agency Portal Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="aspect-video bg-gradient-to-br from-accent/20 to-primary/20 rounded-2xl flex items-center justify-center">
                <Building2 className="h-24 w-24 text-primary/50" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <Badge variant="secondary" className="mb-4">For EMS Agencies</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Agency Competency Management
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Keep your agency compliant with state requirements. Track employee competencies,
                manage verification cycles, and maintain full audit trails.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {agencyFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing#agency">View Agency Plans</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Continuing Education Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">Continuing Education</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Affordable CE for Every Provider
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Quality continuing education shouldn&apos;t break the bank. Individual providers start
                at $69/year for unlimited access. Agencies get flat-rate pricing with no per-seat fees —
                so every member of your team stays current.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {ceFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex items-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/ce">
                    Explore CE Platform <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/ce/catalog">Browse Courses</Link>
                </Button>
              </div>
            </div>
            <div className="relative">
              <Card className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold mb-1">CE Pricing at a Glance</h3>
                  <p className="text-sm text-muted-foreground">No per-seat fees. No hidden costs.</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <div className="font-medium">Individual</div>
                      <div className="text-sm text-muted-foreground">Unlimited courses</div>
                    </div>
                    <div className="text-xl font-bold">$69<span className="text-sm font-normal text-muted-foreground">/yr</span></div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <div className="font-medium">Starter Agency</div>
                      <div className="text-sm text-muted-foreground">Up to 25 employees</div>
                    </div>
                    <div className="text-xl font-bold">$1,000<span className="text-sm font-normal text-muted-foreground">/yr</span></div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <div className="font-medium">Team Agency</div>
                      <div className="text-sm text-muted-foreground">Up to 75 employees</div>
                    </div>
                    <div className="text-xl font-bold">$2,000<span className="text-sm font-normal text-muted-foreground">/yr</span></div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <div className="font-medium">Department</div>
                      <div className="text-sm text-muted-foreground">Up to 200 employees</div>
                    </div>
                    <div className="text-xl font-bold">$4,000<span className="text-sm font-normal text-muted-foreground">/yr</span></div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <div className="font-medium">Enterprise</div>
                      <div className="text-sm text-muted-foreground">Unlimited employees</div>
                    </div>
                    <div className="text-xl font-bold">$7,000<span className="text-sm font-normal text-muted-foreground">/yr</span></div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Free courses available. Per-course purchases from $10.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
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
              Annual plans billed via invoice. No hidden fees.
            </p>
          </div>

          {/* Founders Banner */}
          <div className="max-w-3xl mx-auto mb-10 p-4 rounded-lg border-2 border-primary/30 bg-primary/5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Flame className="h-5 w-5 text-primary" />
              <span className="font-bold text-lg">Founders Pricing — 5 spots remaining</span>
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Lock in these rates before they increase by $1,000. Guaranteed for the life of your account.
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
                    {tier.regularPrice && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        <span className="line-through">{tier.regularPrice}{tier.period}</span>
                        <span className="ml-2 text-primary font-medium">Founders discount</span>
                      </div>
                    )}
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
                Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
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
