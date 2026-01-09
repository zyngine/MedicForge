import Link from "next/link";
import { MarketingLayout } from "@/components/layouts";
import { Badge, Card, CardContent } from "@/components/ui";
import { BookOpen, Video, FileText, Users, ClipboardCheck, BarChart3 } from "lucide-react";

const guides = [
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Getting Started with MedicForge",
    description: "A complete walkthrough of setting up your account and creating your first course.",
    readTime: "10 min read",
  },
  {
    icon: <Video className="h-6 w-6" />,
    title: "Adding Video Content",
    description: "Learn how to embed videos from YouTube, Vimeo, or upload your own content.",
    readTime: "5 min read",
  },
  {
    icon: <ClipboardCheck className="h-6 w-6" />,
    title: "Building Effective Quizzes",
    description: "Best practices for creating quizzes that assess student knowledge effectively.",
    readTime: "8 min read",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Managing Students & Enrollments",
    description: "How to add students, create enrollment codes, and manage class rosters.",
    readTime: "6 min read",
  },
  {
    icon: <ClipboardCheck className="h-6 w-6" />,
    title: "NREMT Competency Tracking",
    description: "Track skills, clinical hours, and patient contacts for certification.",
    readTime: "12 min read",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Using Curve Grading",
    description: "Apply bell curve, square root, or linear curves to assignment grades.",
    readTime: "7 min read",
  },
];

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
            {guides.map((guide, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
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
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto bg-muted/50">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-4">More Guides Coming Soon</h3>
              <p className="text-muted-foreground">
                We&apos;re constantly adding new guides and tutorials. Check back often
                or contact us if you need help with something specific.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
