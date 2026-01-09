import Link from "next/link";
import { MarketingLayout } from "@/components/layouts";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { Heart, Zap, Users } from "lucide-react";

const values = [
  {
    icon: <Heart className="h-6 w-6" />,
    title: "Mission-Driven",
    description: "We're passionate about improving EMS education and saving lives.",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Move Fast",
    description: "We ship quickly, iterate based on feedback, and constantly improve.",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Team First",
    description: "We support each other and celebrate wins together.",
  },
];

export default function CareersPage() {
  return (
    <MarketingLayout>
      <section className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Careers
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Join Our Team
            </h1>
            <p className="text-xl text-muted-foreground">
              Help us build the future of EMS education. We&apos;re always looking
              for talented people who share our mission.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {values.map((value, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    {value.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-semibold mb-4">Open Positions</h3>
              <p className="text-muted-foreground mb-6">
                We don&apos;t have any open positions at the moment, but we&apos;re always
                interested in hearing from talented people. Send us your resume and
                tell us how you&apos;d like to contribute.
              </p>
              <Button asChild>
                <Link href="mailto:admin@medicforge.com">Get in Touch</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
