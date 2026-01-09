import Link from "next/link";
import { MarketingLayout } from "@/components/layouts";
import { Button, Badge, Card, CardContent } from "@/components/ui";
import { BookOpen, GraduationCap, Settings, Users, ClipboardCheck, BarChart3 } from "lucide-react";

const docCategories = [
  {
    icon: <GraduationCap className="h-6 w-6" />,
    title: "Getting Started",
    description: "Learn the basics of MedicForge and set up your first course.",
    articles: ["Quick Start Guide", "Account Setup", "Creating Your First Course"],
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Course Management",
    description: "Learn how to create and manage courses, modules, and lessons.",
    articles: ["Course Builder", "Adding Content", "Enrollment Codes"],
  },
  {
    icon: <ClipboardCheck className="h-6 w-6" />,
    title: "Assignments & Grading",
    description: "Create assignments and grade student submissions.",
    articles: ["Quiz Builder", "Written Assignments", "Curve Grading"],
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "User Management",
    description: "Manage instructors, students, and permissions.",
    articles: ["Adding Users", "Roles & Permissions", "Bulk Import"],
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "NREMT Tracking",
    description: "Track competencies, skills, and clinical hours.",
    articles: ["Skill Checklists", "Clinical Hours", "Competency Reports"],
  },
  {
    icon: <Settings className="h-6 w-6" />,
    title: "Administration",
    description: "Configure settings, billing, and organization details.",
    articles: ["Organization Settings", "Billing", "Custom Branding"],
  },
];

export default function DocsPage() {
  return (
    <MarketingLayout>
      <section className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Documentation
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Learn MedicForge
            </h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to know to get the most out of MedicForge.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {docCategories.map((category, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {category.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{category.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {category.description}
                  </p>
                  <ul className="space-y-2">
                    {category.articles.map((article, i) => (
                      <li key={i}>
                        <Link
                          href="#"
                          className="text-sm text-primary hover:underline"
                        >
                          {article}
                        </Link>
                      </li>
                    ))}
                  </ul>
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
              <h3 className="text-xl font-semibold mb-4">Need More Help?</h3>
              <p className="text-muted-foreground mb-6">
                Can&apos;t find what you&apos;re looking for? Our support team is here to help.
              </p>
              <Button asChild>
                <Link href="/contact">Contact Support</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
