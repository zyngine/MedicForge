"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
  Input,
  Modal,
  ModalFooter,
} from "@/components/ui";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  FileQuestion,
  Link as LinkIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "sonner";

interface Lesson {
  id: string;
  title: string;
  lesson_type: string;
  is_published: boolean;
  order_index: number;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  order_index: number;
  lessons: Lesson[];
}

export default function CourseModulesPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const { profile } = useUser();
  const [modules, setModules] = React.useState<Module[]>([]);
  const [courseName, setCourseName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [expandedModules, setExpandedModules] = React.useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newModuleTitle, setNewModuleTitle] = React.useState("");
  const [isAdding, setIsAdding] = React.useState(false);

  const supabase = createClient();

  const fetchModules = React.useCallback(async () => {
    if (!courseId || !profile?.tenant_id) return;

    try {
      // Fetch course name
      const { data: course } = await (supabase as any)
        .from("courses")
        .select("title")
        .eq("id", courseId)
        .single();

      if (course) setCourseName(course.title);

      // Fetch modules with lessons
      const { data, error } = await (supabase as any)
        .from("modules")
        .select(`
          *,
          lessons(id, title, lesson_type, is_published, order_index)
        `)
        .eq("course_id", courseId)
        .order("order_index");

      if (error) throw error;

      const sortedModules = (data || []).map((m: Module) => ({
        ...m,
        lessons: (m.lessons || []).sort((a: Lesson, b: Lesson) => a.order_index - b.order_index),
      }));

      setModules(sortedModules);
    } catch (err) {
      console.error("Failed to fetch modules:", err);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, profile?.tenant_id, supabase]);

  React.useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim() || !profile?.tenant_id) return;

    setIsAdding(true);
    try {
      const { error } = await (supabase as any)
        .from("modules")
        .insert({
          tenant_id: profile.tenant_id,
          course_id: courseId,
          title: newModuleTitle.trim(),
          order_index: modules.length,
          is_published: false,
        });

      if (error) throw error;

      toast.success("Module added");
      setNewModuleTitle("");
      setShowAddModal(false);
      fetchModules();
    } catch (err) {
      console.error("Failed to add module:", err);
      toast.error("Failed to add module");
    } finally {
      setIsAdding(false);
    }
  };

  const handleTogglePublish = async (module: Module) => {
    try {
      const { error } = await (supabase as any)
        .from("modules")
        .update({ is_published: !module.is_published })
        .eq("id", module.id);

      if (error) throw error;
      fetchModules();
    } catch (err) {
      toast.error("Failed to update module");
    }
  };

  const handleDelete = async (moduleId: string) => {
    if (!confirm("Delete this module and all its lessons?")) return;

    try {
      const { error } = await (supabase as any)
        .from("modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;
      toast.success("Module deleted");
      fetchModules();
    } catch (err) {
      toast.error("Failed to delete module");
    }
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "quiz":
        return <FileQuestion className="h-4 w-4" />;
      case "link":
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/instructor/courses/${courseId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Course Modules</h1>
            <p className="text-muted-foreground">{courseName}</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Module
        </Button>
      </div>

      {/* Modules List */}
      {modules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No modules yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first module to start building your course content.
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Module
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((module, index) => (
            <Card key={module.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => toggleModule(module.id)}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                    {expandedModules.has(module.id) ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                    <div>
                      <CardTitle className="text-lg">
                        Module {index + 1}: {module.title}
                      </CardTitle>
                      {module.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {module.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={module.is_published ? "success" : "secondary"}>
                      {module.is_published ? "Published" : "Draft"}
                    </Badge>
                    <Badge variant="outline">{module.lessons.length} lessons</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(module)}
                    >
                      {module.is_published ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(module.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedModules.has(module.id) && (
                <CardContent>
                  {module.lessons.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">
                      No lessons in this module yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            {getLessonIcon(lesson.lesson_type)}
                            <span>{lesson.title}</span>
                          </div>
                          <Badge variant={lesson.is_published ? "success" : "secondary"}>
                            {lesson.is_published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Module Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Module"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Module Title</label>
            <Input
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              placeholder="e.g., Introduction to Patient Assessment"
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddModule} disabled={isAdding || !newModuleTitle.trim()}>
            {isAdding ? <Spinner size="sm" className="mr-2" /> : null}
            Add Module
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
