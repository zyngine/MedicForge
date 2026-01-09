import Link from "next/link";
import { MarketingLayout } from "@/components/layouts";
import { Badge, Card, CardContent } from "@/components/ui";
import { FileText } from "lucide-react";
import { guides } from "@/data/guides";

export default function GuidesPage() {
  return (
    <MarketingLayout>
      <section className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Guides
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Step-by-Step Guides
            </h1>
            <p className="text-xl text-muted-foreground">
              Detailed tutorials to help you get the most out of MedicForge.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {guides.map((guide) => (
              <Link key={guide.slug} href={`/guides/${guide.slug}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                      {guide.icon}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{guide.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {guide.description}
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 mr-2" />
                      {guide.readTime}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto bg-muted/50">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">Need Help with Something Else?</h3>
              <p className="text-muted-foreground mb-4">
                Can&apos;t find what you&apos;re looking for? Our support team is here to help.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Contact Support
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
