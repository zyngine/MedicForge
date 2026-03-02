"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
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
  Textarea,
  Switch,
  Alert,
  Spinner,
  Modal,
  ModalFooter,
} from "@/components/ui";
import {
  ArrowLeft,
  Share2,
  Globe,
  Lock,
  Copy,
  Eye,
  Users,
  Tag,
  Info,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Layers,
  FileText,
  Clock,
  X,
} from "lucide-react";
import { useCourse } from "@/lib/hooks/use-courses";
import { useModules } from "@/lib/hooks/use-modules";
import {
  useToggleCourseSharing,
  useUpdateCourseSharing,
  useMyClones,
  POPULAR_TAGS,
} from "@/lib/hooks/use-shared-courses";
import { format } from "date-fns";

export default function CourseSharingPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const { data: course, isLoading } = useCourse(courseId);
  const { data: modules = [] } = useModules(courseId);
  const { data: clones = [] } = useMyClones();
  const toggleSharingMutation = useToggleCourseSharing();
  const updateSharingMutation = useUpdateCourseSharing();

  // Cast course to access sharing fields
  const courseData = course as any;

  const [shareDescription, setShareDescription] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [customTag, setCustomTag] = React.useState("");
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [pendingShareState, setPendingShareState] = React.useState<boolean | null>(null);

  // Initialize form from course data
  React.useEffect(() => {
    if (courseData) {
      setShareDescription(courseData.share_description || courseData.description || "");
      setSelectedTags(courseData.share_tags || []);
    }
  }, [courseData]);

  const isShared = courseData?.is_shareable === true;

  const totalLessons = React.useMemo(() => {
    return modules.reduce((sum: number, m: any) => sum + (m.lessons_count || 0), 0);
  }, [modules]);

  // Find clones of this course
  const courseClones = clones.filter((c: any) => c.original_course_id === courseId);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const tag = customTag.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags((prev) => [...prev, tag]);
      setCustomTag("");
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleShareToggle = (newState: boolean) => {
    if (newState === isShared) return;
    setPendingShareState(newState);
    setShowConfirmModal(true);
  };

  const confirmShareToggle = async () => {
    if (pendingShareState === null) return;

    try {
      await toggleSharingMutation.mutateAsync({
        courseId,
        share: pendingShareState,
        shareDescription: shareDescription || undefined,
        shareTags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      setShowConfirmModal(false);
      setPendingShareState(null);
    } catch (error) {
      console.error("Failed to toggle sharing:", error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateSharingMutation.mutateAsync({
        courseId,
        shareDescription,
        shareTags: selectedTags,
      });
    } catch (error) {
      console.error("Failed to update settings:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <Link href="/instructor/courses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </Link>
        <Alert variant="error">
          <p>Course not found.</p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/instructor/courses/${courseId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Share2 className="h-6 w-6" />
              Course Sharing
            </h1>
            <p className="text-muted-foreground">{course.title}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sharing Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sharing Status</CardTitle>
                  <CardDescription>
                    Share your course with other institutions in the MedicForge library
                  </CardDescription>
                </div>
                {isShared ? (
                  <Badge variant="success" className="h-fit">
                    <Globe className="h-3 w-3 mr-1" />
                    Shared
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="h-fit">
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  {isShared ? (
                    <Globe className="h-8 w-8 text-success" />
                  ) : (
                    <Lock className="h-8 w-8 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      {isShared ? "Course is Shared" : "Course is Private"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isShared
                        ? "Other institutions can view and clone this course"
                        : "Only your organization can access this course"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isShared}
                  onCheckedChange={handleShareToggle}
                />
              </div>

              {isShared && courseData?.shared_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Shared on {format(new Date(courseData.shared_at), "MMMM d, yyyy")}
                </div>
              )}

              {!isShared && (
                <Alert variant="info">
                  <Info className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Why share your course?</p>
                    <ul className="text-sm mt-2 space-y-1">
                      <li>- Help other EMS programs with quality content</li>
                      <li>- Get recognition for your curriculum development</li>
                      <li>- Contribute to the MedicForge community</li>
                    </ul>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Share Description */}
          <Card>
            <CardHeader>
              <CardTitle>Share Description</CardTitle>
              <CardDescription>
                This description will be shown to other institutions browsing the library
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={shareDescription}
                onChange={(e) => setShareDescription(e.target.value)}
                placeholder="Describe what makes this course valuable and what topics it covers..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {shareDescription.length}/500 characters
              </p>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Tags
              </CardTitle>
              <CardDescription>
                Add tags to help others find your course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Popular Tags */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Popular tags:</p>
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

              {/* Custom Tags */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Add custom tag:</p>
                <div className="flex gap-2">
                  <Input
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Enter custom tag..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTag();
                      }
                    }}
                  />
                  <Button variant="outline" onClick={addCustomTag}>
                    Add
                  </Button>
                </div>
              </div>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="capitalize">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          {isShared && (
            <div className="flex justify-end">
              <Button
                onClick={handleSaveSettings}
                isLoading={updateSharingMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                What Gets Shared
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Modules</span>
                  <span className="font-medium flex items-center gap-1">
                    <Layers className="h-4 w-4" />
                    {modules.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Lessons</span>
                  <span className="font-medium flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {totalLessons}
                  </span>
                </div>
              </div>

              <hr />

              <div className="space-y-2">
                <p className="text-sm font-medium">Included:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-success" />
                    Course structure
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-success" />
                    Module content
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-success" />
                    Lesson materials
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">NOT Included:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <X className="h-3 w-3 text-muted-foreground" />
                    Student data
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-3 w-3 text-muted-foreground" />
                    Grades & submissions
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-3 w-3 text-muted-foreground" />
                    Enrolled students
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Clone Stats */}
          {isShared && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Clone Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-4xl font-bold text-primary">
                    {courseData?.clone_count || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Times Cloned
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Library Link */}
          {isShared && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 text-center">
                <Globe className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-sm font-medium mb-2">
                  Your course is live in the library
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/courses/library">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Library
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setPendingShareState(null);
        }}
        title={pendingShareState ? "Share Course" : "Stop Sharing Course"}
      >
        <div className="space-y-4">
          {pendingShareState ? (
            <>
              <p className="text-muted-foreground">
                Are you sure you want to share &quot;{course.title}&quot; with other institutions?
              </p>
              <Alert variant="info">
                <Info className="h-4 w-4" />
                <div className="text-sm">
                  <p className="font-medium">What happens when you share:</p>
                  <ul className="mt-1 space-y-1">
                    <li>- Course appears in the MedicForge library</li>
                    <li>- Other institutions can preview the structure</li>
                    <li>- Others can clone your course to their organization</li>
                    <li>- Your student data is never shared</li>
                  </ul>
                </div>
              </Alert>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Are you sure you want to stop sharing &quot;{course.title}&quot;?
              </p>
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <div className="text-sm">
                  <p className="font-medium">Note:</p>
                  <ul className="mt-1 space-y-1">
                    <li>- Course will be removed from the library</li>
                    <li>- Existing clones will not be affected</li>
                    <li>- You can share again at any time</li>
                  </ul>
                </div>
              </Alert>
            </>
          )}

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmModal(false);
                setPendingShareState(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmShareToggle}
              isLoading={toggleSharingMutation.isPending}
              variant={pendingShareState ? "default" : "destructive"}
            >
              {pendingShareState ? (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Share Course
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Stop Sharing
                </>
              )}
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
