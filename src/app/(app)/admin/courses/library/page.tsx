"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import {
  Library,
  Search,
  BookOpen,
  Users,
  Star,
  Filter,
  Copy,
  ExternalLink,
  Award,
  Layers,
  FileText,
} from "lucide-react";
import {
  useSharedCourses,
  CERTIFICATION_LEVELS,
  POPULAR_TAGS,
  formatCloneCount,
  getCertificationLabel,
  type SharedCourse,
} from "@/lib/hooks/use-shared-courses";

export default function CourseLibraryPage() {
  const [search, setSearch] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [certLevel, setCertLevel] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"recent" | "popular" | "alphabetical">("popular");

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: courses = [], isLoading } = useSharedCourses({
    search: debouncedSearch || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    certificationLevel: certLevel || undefined,
    sortBy,
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Stats
  const stats = React.useMemo(() => {
    const official = courses.filter((c) => c.is_official).length;
    const totalClones = courses.reduce((sum, c) => sum + c.clone_count, 0);
    return { total: courses.length, official, totalClones };
  }, [courses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Library className="h-7 w-7" />
            Course Library
          </h1>
          <p className="text-muted-foreground">
            Browse and clone courses shared by other institutions
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Available Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.official}</p>
                <p className="text-xs text-muted-foreground">Official Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Copy className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalClones}</p>
                <p className="text-xs text-muted-foreground">Total Clones</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search and Sort */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search courses..."
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={certLevel}
                  onChange={setCertLevel}
                  options={[
                    { value: "", label: "All Levels" },
                    ...CERTIFICATION_LEVELS.map((l) => ({
                      value: l.value,
                      label: l.label,
                    })),
                  ]}
                />
                <Select
                  value={sortBy}
                  onChange={(v) => setSortBy(v as typeof sortBy)}
                  options={[
                    { value: "popular", label: "Most Popular" },
                    { value: "recent", label: "Recently Added" },
                    { value: "alphabetical", label: "A-Z" },
                  ]}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by topic:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Spinner size="lg" />
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Library className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Courses Found</h3>
            <p className="text-muted-foreground">
              {search || selectedTags.length > 0 || certLevel
                ? "Try adjusting your search filters."
                : "No shared courses are available yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: SharedCourse }) {
  return (
    <Link href={`/admin/courses/library/${course.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {course.is_official && (
                  <Badge variant="warning" className="text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    Official
                  </Badge>
                )}
                {course.course_type && (
                  <Badge variant="outline" className="text-xs">
                    {getCertificationLabel(course.course_type)}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base line-clamp-2">{course.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {course.share_description || course.description || "No description"}
          </p>

          {/* Tags */}
          {course.share_tags && course.share_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {course.share_tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs capitalize">
                  {tag}
                </Badge>
              ))}
              {course.share_tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{course.share_tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Layers className="h-4 w-4" />
                {course.module_count} modules
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {course.lesson_count} lessons
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Copy className="h-4 w-4" />
              {course.clone_count}
            </span>
          </div>

          {/* Provider */}
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            By {course.tenant_name || "Unknown"}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
