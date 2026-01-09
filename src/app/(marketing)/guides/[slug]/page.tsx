import { notFound } from "next/navigation";
import Link from "next/link";
import { MarketingLayout } from "@/components/layouts";
import { Badge, Card, CardContent } from "@/components/ui";
import { ArrowLeft, Clock, FileText } from "lucide-react";
import { guides, getGuideBySlug } from "@/data/guides";

interface GuidePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return guides.map((guide) => ({
    slug: guide.slug,
  }));
}

export async function generateMetadata({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {
      title: "Guide Not Found | MedicForge",
    };
  }

  return {
    title: `${guide.title} | MedicForge Guides`,
    description: guide.description,
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  // Get related guides (excluding current)
  const relatedGuides = guides.filter((g) => g.slug !== slug).slice(0, 3);

  return (
    <MarketingLayout>
      <article className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Back link */}
            <Link
              href="/guides"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Guides
            </Link>

            {/* Header */}
            <header className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  {guide.icon}
                </div>
                <Badge variant="secondary">Guide</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{guide.title}</h1>
              <p className="text-xl text-muted-foreground mb-4">{guide.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {guide.readTime}
                </span>
              </div>
            </header>

            {/* Content */}
            <div className="prose prose-slate dark:prose-invert max-w-none">
              {guide.content}
            </div>

            {/* Related Guides */}
            <section className="mt-16 pt-8 border-t">
              <h2 className="text-2xl font-bold mb-6">Related Guides</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {relatedGuides.map((relatedGuide) => (
                  <Link key={relatedGuide.slug} href={`/guides/${relatedGuide.slug}`}>
                    <Card className="hover:shadow-lg transition-shadow h-full">
                      <CardContent className="p-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                          {relatedGuide.icon}
                        </div>
                        <h3 className="font-semibold mb-1 line-clamp-2">{relatedGuide.title}</h3>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <FileText className="h-3 w-3 mr-1" />
                          {relatedGuide.readTime}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </article>
    </MarketingLayout>
  );
}
