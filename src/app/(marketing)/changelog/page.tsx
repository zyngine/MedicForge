import { MarketingLayout } from "@/components/layouts";
import { Badge, Card, CardContent } from "@/components/ui";
import { Sparkles, Bug, Zap } from "lucide-react";

const releases = [
  {
    version: "1.0.0",
    date: "January 2025",
    title: "Initial Release",
    changes: [
      { type: "feature", text: "Course management with modules and lessons" },
      { type: "feature", text: "Quiz builder with auto-grading" },
      { type: "feature", text: "Written assignment submissions" },
      { type: "feature", text: "NREMT competency tracking" },
      { type: "feature", text: "Clinical hours logging" },
      { type: "feature", text: "Discussion forums" },
      { type: "feature", text: "Real-time notifications" },
      { type: "feature", text: "Student calendar view" },
      { type: "feature", text: "Curve grading options" },
      { type: "feature", text: "Multi-tenant architecture" },
    ],
  },
];

const typeIcons = {
  feature: <Sparkles className="h-4 w-4 text-primary" />,
  fix: <Bug className="h-4 w-4 text-orange-500" />,
  improvement: <Zap className="h-4 w-4 text-blue-500" />,
};

const typeLabels = {
  feature: "New",
  fix: "Fix",
  improvement: "Improved",
};

export default function ChangelogPage() {
  return (
    <MarketingLayout>
      <section className="py-20 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              Changelog
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              What&apos;s New
            </h1>
            <p className="text-xl text-muted-foreground">
              Stay up to date with the latest features, improvements, and fixes.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-8">
            {releases.map((release, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Badge>v{release.version}</Badge>
                    <span className="text-muted-foreground">{release.date}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{release.title}</h3>
                  <ul className="space-y-3">
                    {release.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-3">
                        {typeIcons[change.type as keyof typeof typeIcons]}
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {typeLabels[change.type as keyof typeof typeLabels]}:
                          </span>{" "}
                          {change.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
