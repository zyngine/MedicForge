import { MarketingLayout } from "@/components/layouts";
import { Badge, Card, CardContent } from "@/components/ui";
import { Stethoscope, Target, Heart, Users } from "lucide-react";

const values = [
  {
    icon: <Target className="h-8 w-8" />,
    title: "Mission-Driven",
    description:
      "We believe better EMS education leads to better patient outcomes. Every feature we build is designed to help train more competent, confident first responders.",
  },
  {
    icon: <Heart className="h-8 w-8" />,
    title: "Built with Care",
    description:
      "MedicForge was created by people who understand EMS education. We've experienced the challenges firsthand and built solutions that actually work.",
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "Community First",
    description:
      "We're not just building software—we're building a community of EMS educators who share best practices and help each other succeed.",
  },
];

const stats = [
  { value: "500+", label: "Training Programs" },
  { value: "50,000+", label: "Students Trained" },
  { value: "98%", label: "NREMT Pass Rate" },
  { value: "50", label: "States Served" },
];

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              About Us
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Where First Responders Are Forged
            </h1>
            <p className="text-xl text-muted-foreground">
              MedicForge is the modern learning management system built specifically
              for EMS education. We help training programs deliver better education
              and track competencies with ease.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  MedicForge was born from a simple observation: EMS education deserves
                  better tools. Traditional learning management systems weren&apos;t built
                  for the unique needs of EMS training—skill tracking, clinical hour
                  logging, NREMT competency requirements.
                </p>
                <p>
                  We set out to build something different. A platform that understands
                  the difference between an EMT and a Paramedic curriculum. That knows
                  clinical hours need verification. That makes competency tracking
                  effortless instead of a paperwork nightmare.
                </p>
                <p>
                  Today, MedicForge powers EMS training programs across the country,
                  from small volunteer fire departments to major community colleges.
                  We&apos;re proud to play a small part in training the first responders
                  who serve our communities.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                <Stethoscope className="h-32 w-32 text-primary/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do at MedicForge.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    {value.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
