"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Badge,
  Spinner,
} from "@/components/ui";
import {
  Link2,
  ExternalLink,
  Star,
  GraduationCap,
  Stethoscope,
  Shirt,
  BookOpen,
  FileText,
  MoreHorizontal,
  FolderOpen,
} from "lucide-react";
import {
  useStudentLinks,
  groupLinksByCategory,
  getCategoryLabel,
  StudentLink,
} from "@/lib/hooks/use-program-links";

// Map category to icon
const getCategoryIcon = (category: string) => {
  switch (category) {
    case "certification":
      return GraduationCap;
    case "clinical":
      return Stethoscope;
    case "uniforms":
      return Shirt;
    case "resources":
      return BookOpen;
    case "forms":
      return FileText;
    default:
      return MoreHorizontal;
  }
};

// Map category to color classes
const getCategoryColor = (category: string) => {
  switch (category) {
    case "certification":
      return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
    case "clinical":
      return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
    case "uniforms":
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "resources":
      return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
    case "forms":
      return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

function LinkCard({ link }: { link: StudentLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-lg border hover:border-primary hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {link.is_required && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
            <h3 className="font-medium group-hover:text-primary truncate">
              {link.title}
            </h3>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
          {link.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {link.description}
            </p>
          )}
          {link.program_name && (
            <Badge variant="outline" className="mt-2 text-xs">
              {link.program_name}
            </Badge>
          )}
        </div>
      </div>
    </a>
  );
}

/* eslint-disable react-hooks/static-components -- CategoryIcon is a static Lucide component reference, not dynamically created */
function CategorySection({
  category,
  links,
}: {
  category: string;
  links: StudentLink[];
}) {
  const CategoryIcon = getCategoryIcon(category);
  const colorClass = getCategoryColor(category);

  // Separate required and optional links
  const requiredLinks = links.filter((l) => l.is_required);
  const optionalLinks = links.filter((l) => !l.is_required);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <CategoryIcon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{getCategoryLabel(category)}</CardTitle>
            <CardDescription>
              {links.length} resource{links.length !== 1 ? "s" : ""}
              {requiredLinks.length > 0 && ` (${requiredLinks.length} required)`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Required links first */}
        {requiredLinks.length > 0 && (
          <div className="space-y-2">
            {requiredLinks.map((link) => (
              <LinkCard key={link.id} link={link} />
            ))}
          </div>
        )}
        {/* Optional links */}
        {optionalLinks.length > 0 && (
          <div className="space-y-2">
            {optionalLinks.map((link) => (
              <LinkCard key={link.id} link={link} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function StudentResourcesPage() {
  const { data: links = [], isLoading } = useStudentLinks();

  const linksByCategory = React.useMemo(() => {
    return groupLinksByCategory(links);
  }, [links]);

  // Count required links
  const requiredCount = links.filter((l) => l.is_required).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen className="h-6 w-6" />
          Program Resources
        </h1>
        <p className="text-muted-foreground">
          Important links and resources for your program
        </p>
      </div>

      {/* Required Resources Alert */}
      {requiredCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">
                {requiredCount} required resource{requiredCount !== 1 ? "s" : ""}
              </span>
              <span className="text-muted-foreground">
                - Make sure to review these important links
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {links.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No resources yet</h3>
            <p className="text-muted-foreground">
              Your program administrator hasn&apos;t added any resource links yet.
              Check back later!
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Links by Category */
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from(linksByCategory.entries()).map(([category, categoryLinks]) => (
            <CategorySection
              key={category}
              category={category}
              links={categoryLinks}
            />
          ))}
        </div>
      )}
    </div>
  );
}
