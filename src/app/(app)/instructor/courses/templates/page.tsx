"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Badge,
  Modal,
  ModalFooter,
  Label,
  Spinner,
  Alert,
} from "@/components/ui";
import {
  ArrowLeft,
  BookOpen,
  Download,
  Plus,
  Search,
  Star,
  Users,
  Clock,
  FileText,
  Sparkles,
  Share2,
  Trash2,
  Copy,
} from "lucide-react";
import { useCourseTemplates, useApplyTemplate } from "@/lib/hooks/use-course-templates";
import { useCourses } from "@/lib/hooks/use-courses";
import { useUser } from "@/lib/hooks/use-user";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Loader2, CheckCircle } from "lucide-react";
import { Select } from "@/components/ui";

// Template type that works for both system and user templates
interface TemplateForImport {
  id: string;
  title: string;
  description: string | null;
  course_type: string | null;
  template_data: {
    modules?: Array<{
      title: string;
      description?: string;
      order_index: number;
      lessons?: Array<{
        title: string;
        content_type: string;
        content?: unknown;
        order_index: number;
      }>;
    }>;
    assignments?: Array<{
      title: string;
      description?: string;
      type: string;
      points_possible: number;
      module_index?: number;
    }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings?: Record<string, any>;
  } | null;
}

// Pre-built system templates (these would ideally be in the database with is_official=true)
const SYSTEM_TEMPLATES: (TemplateForImport & { is_official: boolean; usage_count: number; tags: string[] })[] = [
  {
    id: "system-emr",
    title: "EMR - Emergency Medical Responder",
    description: "Complete EMR curriculum aligned with National EMS Education Standards. Includes all required modules, lessons, and skill sheets.",
    course_type: "EMR",
    is_official: true,
    usage_count: 245,
    template_data: {
      modules: [
        {
          title: "Module 1: Introduction to EMS",
          description: "Overview of EMS systems, roles, and responsibilities",
          order_index: 0,
          lessons: [
            { title: "EMS Systems Overview", content_type: "text", order_index: 0 },
            { title: "Roles and Responsibilities", content_type: "text", order_index: 1 },
            { title: "Medical-Legal Considerations", content_type: "text", order_index: 2 },
          ],
        },
        {
          title: "Module 2: Anatomy & Physiology",
          description: "Basic human anatomy and physiology for EMRs",
          order_index: 1,
          lessons: [
            { title: "Body Systems Overview", content_type: "text", order_index: 0 },
            { title: "Cardiovascular System", content_type: "text", order_index: 1 },
            { title: "Respiratory System", content_type: "text", order_index: 2 },
          ],
        },
        {
          title: "Module 3: Patient Assessment",
          description: "Scene size-up, primary and secondary assessment",
          order_index: 2,
          lessons: [
            { title: "Scene Size-Up", content_type: "text", order_index: 0 },
            { title: "Primary Assessment", content_type: "text", order_index: 1 },
            { title: "Secondary Assessment", content_type: "text", order_index: 2 },
            { title: "Vital Signs", content_type: "text", order_index: 3 },
          ],
        },
        {
          title: "Module 4: Airway Management",
          description: "Basic airway techniques and oxygen therapy",
          order_index: 3,
        },
        {
          title: "Module 5: Medical Emergencies",
          description: "Common medical emergencies and interventions",
          order_index: 4,
        },
        {
          title: "Module 6: Trauma Emergencies",
          description: "Trauma assessment and management",
          order_index: 5,
        },
        {
          title: "Module 7: Special Populations",
          description: "Pediatric, geriatric, and special needs patients",
          order_index: 6,
        },
      ],
    },
    tags: ["NREMT", "National Standards", "Entry Level"],
  },
  {
    id: "system-emt",
    title: "EMT - Emergency Medical Technician",
    description: "Comprehensive EMT curriculum meeting NREMT requirements. Includes didactic content, practical skills, and assessment tools.",
    course_type: "EMT",
    is_official: true,
    usage_count: 892,
    template_data: {
      modules: [
        {
          title: "Module 1: Preparatory",
          description: "EMS systems, workforce safety, documentation, and communications",
          order_index: 0,
          lessons: [
            { title: "Introduction to EMS", content_type: "text", order_index: 0 },
            { title: "Workforce Safety and Wellness", content_type: "text", order_index: 1 },
            { title: "Documentation", content_type: "text", order_index: 2 },
            { title: "EMS Communications", content_type: "text", order_index: 3 },
            { title: "Medical/Legal and Ethics", content_type: "text", order_index: 4 },
          ],
        },
        {
          title: "Module 2: Anatomy & Physiology",
          description: "Comprehensive A&P for EMTs",
          order_index: 1,
          lessons: [
            { title: "Medical Terminology", content_type: "text", order_index: 0 },
            { title: "Body Systems Overview", content_type: "text", order_index: 1 },
            { title: "Cardiovascular System", content_type: "text", order_index: 2 },
            { title: "Respiratory System", content_type: "text", order_index: 3 },
            { title: "Nervous System", content_type: "text", order_index: 4 },
            { title: "Musculoskeletal System", content_type: "text", order_index: 5 },
          ],
        },
        {
          title: "Module 3: Pathophysiology",
          description: "Understanding disease processes",
          order_index: 2,
        },
        {
          title: "Module 4: Pharmacology",
          description: "Medication administration and EMT medications",
          order_index: 3,
        },
        {
          title: "Module 5: Airway Management",
          description: "Basic and advanced airway techniques",
          order_index: 4,
        },
        {
          title: "Module 6: Patient Assessment",
          description: "Comprehensive patient assessment techniques",
          order_index: 5,
        },
        {
          title: "Module 7: Medicine",
          description: "Medical emergencies including cardiac, respiratory, neurological",
          order_index: 6,
        },
        {
          title: "Module 8: Shock and Resuscitation",
          description: "Shock recognition and management, BLS",
          order_index: 7,
        },
        {
          title: "Module 9: Trauma",
          description: "Trauma assessment and management",
          order_index: 8,
        },
        {
          title: "Module 10: Special Patient Populations",
          description: "Obstetrics, pediatrics, geriatrics",
          order_index: 9,
        },
        {
          title: "Module 11: EMS Operations",
          description: "Ambulance operations, MCI, hazmat awareness",
          order_index: 10,
        },
      ],
    },
    tags: ["NREMT", "National Standards", "BLS"],
  },
  {
    id: "system-aemt",
    title: "AEMT - Advanced EMT",
    description: "Advanced EMT curriculum bridging EMT to Paramedic. Covers IV therapy, advanced airways, and expanded medication administration.",
    course_type: "AEMT",
    is_official: true,
    usage_count: 156,
    template_data: {
      modules: [
        {
          title: "Module 1: Preparatory",
          description: "Advanced concepts in EMS systems and patient care",
          order_index: 0,
        },
        {
          title: "Module 2: Anatomy & Physiology Review",
          description: "Advanced A&P concepts",
          order_index: 1,
        },
        {
          title: "Module 3: Advanced Airway Management",
          description: "Supraglottic airways and advanced techniques",
          order_index: 2,
        },
        {
          title: "Module 4: IV Access & Fluid Therapy",
          description: "Peripheral IV access and fluid administration",
          order_index: 3,
        },
        {
          title: "Module 5: Pharmacology",
          description: "AEMT medication formulary and administration",
          order_index: 4,
        },
        {
          title: "Module 6: Medical Emergencies",
          description: "Advanced medical patient care",
          order_index: 5,
        },
        {
          title: "Module 7: Trauma Emergencies",
          description: "Advanced trauma assessment and management",
          order_index: 6,
        },
        {
          title: "Module 8: Special Populations",
          description: "Advanced care for special patient groups",
          order_index: 7,
        },
      ],
    },
    tags: ["NREMT", "National Standards", "Advanced"],
  },
  {
    id: "system-paramedic",
    title: "Paramedic",
    description: "Complete Paramedic curriculum aligned with National EMS Education Standards. Comprehensive content for all aspects of advanced prehospital care.",
    course_type: "Paramedic",
    is_official: true,
    usage_count: 423,
    template_data: {
      modules: [
        {
          title: "Module 1: Preparatory",
          description: "EMS systems, research, public health, and medical-legal",
          order_index: 0,
        },
        {
          title: "Module 2: Anatomy & Physiology",
          description: "Comprehensive A&P for paramedics",
          order_index: 1,
        },
        {
          title: "Module 3: Pathophysiology",
          description: "Disease processes and cellular injury",
          order_index: 2,
        },
        {
          title: "Module 4: Pharmacology",
          description: "Comprehensive pharmacology and medication administration",
          order_index: 3,
        },
        {
          title: "Module 5: Airway Management",
          description: "Advanced airway including RSI and surgical airways",
          order_index: 4,
        },
        {
          title: "Module 6: Patient Assessment",
          description: "Advanced assessment techniques",
          order_index: 5,
        },
        {
          title: "Module 7: Cardiology",
          description: "12-lead ECG interpretation and cardiac emergencies",
          order_index: 6,
        },
        {
          title: "Module 8: Medical Emergencies",
          description: "Comprehensive medical patient care",
          order_index: 7,
        },
        {
          title: "Module 9: Trauma",
          description: "Advanced trauma life support",
          order_index: 8,
        },
        {
          title: "Module 10: Special Populations",
          description: "Neonatal, pediatric, geriatric, and special needs",
          order_index: 9,
        },
        {
          title: "Module 11: Operations",
          description: "EMS operations, MCI, hazmat, and rescue",
          order_index: 10,
        },
        {
          title: "Module 12: Clinical Integration",
          description: "Putting it all together - case scenarios",
          order_index: 11,
        },
      ],
    },
    tags: ["NREMT", "National Standards", "ALS", "Comprehensive"],
  },
];

export default function CourseTemplatesPage() {
  const router = useRouter();
  const { profile: _profile } = useUser();
  const { templates, isLoading, createFromCourse: _createFromCourse, deleteTemplate, duplicateTemplate, toggleShared, updateFromCourse } = useCourseTemplates();
  const { applyTemplate } = useApplyTemplate();
  const { data: courses = [] } = useCourses();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTemplate, setSelectedTemplate] = React.useState<TemplateForImport | null>(null);
  const [importModalOpen, setImportModalOpen] = React.useState(false);
  const [newCourseName, setNewCourseName] = React.useState("");
  const [isImporting, setIsImporting] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"official" | "my-templates">("official");

  // Update from course state
  const [updateModalOpen, setUpdateModalOpen] = React.useState(false);
  const [updateTemplateId, setUpdateTemplateId] = React.useState<string | null>(null);
  const [updateCourseId, setUpdateCourseId] = React.useState<string>("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Get the template being updated
  const templateToUpdate = templates.find((t) => t.id === updateTemplateId);

  // Course options for select
  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: `${c.title} (${c.course_type || "Custom"})`,
  }));

  // Filter templates based on search
  const filteredSystemTemplates = SYSTEM_TEMPLATES.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (t.course_type?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const filteredUserTemplates = templates.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const handleImportTemplate = async () => {
    if (!selectedTemplate || !newCourseName.trim()) return;

    setIsImporting(true);
    try {
      // For system templates, we create the course directly
      // For user templates, we use the applyTemplate hook
      if (selectedTemplate.id.startsWith("system-")) {
        // Create course with template data
        const response = await fetch("/api/courses/import-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateData: selectedTemplate.template_data,
            courseName: newCourseName,
            courseType: selectedTemplate.course_type,
            description: selectedTemplate.description,
          }),
        });

        if (!response.ok) throw new Error("Failed to import template");

        const { courseId } = await response.json();
        router.push(`/instructor/courses/${courseId}`);
      } else {
        // User template - use existing hook
        const courseId = await applyTemplate(selectedTemplate.id, {
          title: newCourseName,
        });
        if (courseId) {
          router.push(`/instructor/courses/${courseId}`);
        }
      }
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsImporting(false);
      setImportModalOpen(false);
    }
  };

  const openImportModal = (template: TemplateForImport) => {
    setSelectedTemplate(template);
    setNewCourseName(template.title + " - " + new Date().getFullYear());
    setImportModalOpen(true);
  };

  const handleOpenUpdateModal = (templateId: string) => {
    setUpdateTemplateId(templateId);
    setUpdateCourseId("");
    setUpdateModalOpen(true);
  };

  const handleUpdateFromCourse = async () => {
    if (!updateTemplateId || !updateCourseId) return;

    setIsUpdating(true);
    try {
      const success = await updateFromCourse(updateTemplateId, updateCourseId, {
        includeModules: true,
        includeLessons: true,
        includeAssignments: true,
      });

      if (success) {
        setUpdateModalOpen(false);
        setUpdateTemplateId(null);
        setUpdateCourseId("");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const getCourseTypeColor = (type: string) => {
    switch (type) {
      case "EMR":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "EMT":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "AEMT":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "Paramedic":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/instructor/courses">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Course Templates</h1>
          <p className="text-muted-foreground">
            Import pre-built courses or save your own as templates for reuse
          </p>
        </div>
        <Button asChild>
          <Link href="/instructor/courses/new">
            <Plus className="h-4 w-4 mr-2" />
            Create from Scratch
          </Link>
        </Button>
      </div>

      {/* Search and Tabs */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex border rounded-lg overflow-hidden">
          <button
            onClick={() => setActiveTab("official")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "official"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            }`}
          >
            <Sparkles className="h-4 w-4 inline mr-2" />
            Official Templates
          </button>
          <button
            onClick={() => setActiveTab("my-templates")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "my-templates"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            My Templates
          </button>
        </div>
      </div>

      {/* Official Templates */}
      {activeTab === "official" && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredSystemTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getCourseTypeColor(template.course_type || "Custom")}>
                      {template.course_type || "Custom"}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      Official
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {template.usage_count} uses
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-2">{template.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {template.template_data?.modules?.length || 0} modules
                  </span>
                  {template.tags && (
                    <div className="flex gap-1">
                      {template.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={() => openImportModal(template)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* My Templates */}
      {activeTab === "my-templates" && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : filteredUserTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No templates yet</h3>
                <p className="text-muted-foreground mb-4">
                  Save one of your courses as a template to reuse it for future classes
                </p>
                <Button variant="outline" asChild>
                  <Link href="/instructor/courses">
                    Go to My Courses
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredUserTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge className={getCourseTypeColor(template.course_type || "Custom")}>
                        {template.course_type || "Custom"}
                      </Badge>
                      {template.is_shared && (
                        <Badge variant="outline">
                          <Share2 className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-2">{template.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {template.template_data?.modules?.length || 0} modules
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => openImportModal(template)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Use Template
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenUpdateModal(template.id)}
                        title="Update from course"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => duplicateTemplate(template.id, template.title + " (Copy)")}
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleShared(template.id)}
                        title={template.is_shared ? "Unshare" : "Share"}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteTemplate(template.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Import Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Course Template"
        description={`Create a new course based on "${selectedTemplate?.title}"`}
      >
        <div className="space-y-4 py-4">
          <Alert variant="default">
            <Sparkles className="h-4 w-4" />
            <p className="text-sm">
              This will create a new course with all modules and lessons from the template.
              You can customize everything after import.
            </p>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="courseName" required>
              Course Name
            </Label>
            <Input
              id="courseName"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              placeholder="e.g., EMT Basic - Spring 2024"
            />
            <p className="text-xs text-muted-foreground">
              You can change this name anytime after creating the course
            </p>
          </div>

          {selectedTemplate && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Template includes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  <BookOpen className="h-4 w-4 inline mr-2" />
                  {selectedTemplate.template_data?.modules?.length || 0} modules
                </li>
                <li>
                  <FileText className="h-4 w-4 inline mr-2" />
                  Course structure and outline
                </li>
              </ul>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setImportModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImportTemplate}
            disabled={!newCourseName.trim() || isImporting}
          >
            {isImporting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Importing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Import & Create Course
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Update Template from Course Modal */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title="Update Template"
        description={`Update "${templateToUpdate?.title}" with content from a course`}
      >
        <div className="space-y-4 py-4">
          <Alert variant="warning">
            <RefreshCw className="h-4 w-4" />
            <p className="text-sm">
              This will replace all modules, lessons, and assignments in this template
              with the content from the selected course.
            </p>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="updateCourseSelect" required>
              Select Course
            </Label>
            {courseOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No courses available. Create a course first.
              </p>
            ) : (
              <Select
                id="updateCourseSelect"
                value={updateCourseId}
                onChange={(value) => setUpdateCourseId(value)}
                options={courseOptions}
                placeholder="Choose a course..."
              />
            )}
            <p className="text-xs text-muted-foreground">
              Choose the course that has the updated content you want to save
            </p>
          </div>

          {updateCourseId && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">What will be updated:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-success" />
                  All modules and structure
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-success" />
                  All lessons and content
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-success" />
                  All assignments
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-success" />
                  Course type and description
                </li>
              </ul>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setUpdateModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateFromCourse}
            disabled={!updateCourseId || isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Template
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
