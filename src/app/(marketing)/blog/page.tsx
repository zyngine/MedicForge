import { MarketingLayout } from "@/components/layouts";
import { Badge, Card, CardContent } from "@/components/ui";
import { Calendar } from "lucide-react";

const posts = [
  {
    title: "Introducing MedicForge: A New Era in EMS Education",
    excerpt:
      "We're excited to announce MedicForge, the modern learning management system built specifically for EMS training programs.",
    date: "January 2025",
    category: "Announcements",
  },
  {
    title: "5 Tips for Effective Online EMS Training",
    excerpt:
      "Online learning is here to stay. Here are our top tips for making your EMS courses engaging and effective.",
    date: "January 2025",
    category: "Education",
  },
  {
    title: "Understanding NREMT Competency Requirements",
    excerpt:
      "A comprehensive guide to tracking and documenting the competencies required for NREMT certification.",
    date: "January 2025",
    category: "Compliance",
  },
];

export default function BlogPage() {
  return (
    <MarketingLayout>
      <section className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Blog
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Insights & Updates
            </h1>
            <p className="text-xl text-muted-foreground">
              Tips, guides, and news about EMS education and MedicForge.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {posts.map((post, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <Badge variant="secondary" className="mb-4">
                    {post.category}
                  </Badge>
                  <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {post.date}
                  </div>
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
              <h3 className="text-xl font-semibold mb-4">Stay Updated</h3>
              <p className="text-muted-foreground">
                More content coming soon. Check back for the latest news and insights
                about EMS education.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
