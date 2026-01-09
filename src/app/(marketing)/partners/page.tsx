import Link from "next/link";
import { MarketingLayout } from "@/components/layouts";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { Handshake, Building2, GraduationCap, Award } from "lucide-react";

const partnerTypes = [
  {
    icon: <Building2 className="h-8 w-8" />,
    title: "Training Centers",
    description:
      "Partner with us to offer MedicForge to your students and instructors.",
  },
  {
    icon: <GraduationCap className="h-8 w-8" />,
    title: "Educational Institutions",
    description:
      "Special pricing and features for colleges and universities.",
  },
  {
    icon: <Award className="h-8 w-8" />,
    title: "Resellers",
    description:
      "Become an authorized reseller and grow your business with MedicForge.",
  },
];

export default function PartnersPage() {
  return (
    <MarketingLayout>
      <section className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Partners
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Partner with MedicForge
            </h1>
            <p className="text-xl text-muted-foreground">
              Join our partner network and help bring better EMS education to
              training programs everywhere.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {partnerTypes.map((type, index) => (
              <Card key={index}>
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                    {type.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{type.title}</h3>
                  <p className="text-muted-foreground">{type.description}</p>
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
              <Handshake className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-semibold mb-4">Become a Partner</h3>
              <p className="text-muted-foreground mb-6">
                Interested in partnering with MedicForge? We&apos;d love to hear from
                you. Contact us to learn about partnership opportunities.
              </p>
              <Button asChild>
                <Link href="/contact?type=partnership">Contact Us</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
