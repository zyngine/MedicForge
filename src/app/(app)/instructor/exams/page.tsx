"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  ModalFooter,
  Spinner,
} from "@/components/ui";
import {
  Plus,
  Search,
  ClipboardList,
  Clock,
  Users,
  BarChart3,
  Settings,
  Play,
  Pause,
  Trash2,
  Edit,
  Copy,
  Eye,
  Brain,
  Target,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  useExamTemplates,
  useStandardizedExams,
  type ExamTemplate,
  type StandardizedExam,
} from "@/lib/hooks/use-standardized-exams";
import { formatDate } from "@/lib/utils";

const examTypeLabels: Record<string, string> = {
  standard: "Standard",
  cat: "Adaptive (CAT)",
};

const certificationColors: Record<string, string> = {
  EMR: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  EMT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  AEMT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Paramedic: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function InstructorExamsPage() {
  const { templates, isLoading: templatesLoading } = useExamTemplates();
  const { exams, isLoading: examsLoading, createExam, updateExam, deleteExam } = useStandardizedExams();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>("");
  const [newExam, setNewExam] = React.useState({
    title: "",
    description: "",
    available_from: "",
    available_until: "",
  });

  const isLoading = templatesLoading || examsLoading;

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || exam.template?.exam_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCreateExam = async () => {
    if (!selectedTemplate || !newExam.title) return;

    const result = await createExam({
      template_id: selectedTemplate,
      title: newExam.title,
      description: newExam.description || null,
      available_from: newExam.available_from || null,
      available_until: newExam.available_until || null,
      is_published: false,
    });

    if (result) {
      setShowCreateModal(false);
      setSelectedTemplate("");
      setNewExam({ title: "", description: "", available_from: "", available_until: "" });
    }
  };

  const handlePublish = async (exam: StandardizedExam) => {
    await updateExam(exam.id, { is_published: !exam.is_published });
  };

  const handleDelete = async (examId: string) => {
    if (confirm("Are you sure you want to delete this exam?")) {
      await deleteExam(examId);
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Standardized Exams</h1>
          <p className="text-muted-foreground">
            Create and manage NREMT-style exams including adaptive (CAT) testing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/instructor/exams/templates">
              <Settings className="h-4 w-4 mr-2" />
              Manage Templates
            </Link>
          </Button>
          <Button onClick={() => setShowCreateModal(true)} disabled={templates.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Create Exam
          </Button>
        </div>
      </div>

      {/* No Templates Warning */}
      {templates.length === 0 && (
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">No exam templates available</p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  You need to create at least one exam template before you can create exams.
                  Templates define the structure, rules, and question configuration for exams.
                </p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/instructor/exams/templates">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Template
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam Templates Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Exams</p>
                <p className="text-2xl font-bold">{exams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">{exams.filter((e) => e.is_published).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CAT Exams</p>
                <p className="text-2xl font-bold">{exams.filter((e) => e.template?.exam_type === "cat").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select
              options={[
                { value: "all", label: "All Types" },
                { value: "standard", label: "Standard" },
                { value: "cat", label: "Adaptive (CAT)" },
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
              className="w-[180px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Exams List */}
      {filteredExams.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No exams found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || typeFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first standardized exam to get started"}
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Exam
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onPublish={() => handlePublish(exam)}
              onDelete={() => handleDelete(exam.id)}
            />
          ))}
        </div>
      )}

      {/* Create Exam Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Standardized Exam"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Exam Template</label>
            <Select
              options={[
                { value: "", label: "Select a template..." },
                ...templates.map((t) => ({
                  value: t.id,
                  label: `${t.name} (${examTypeLabels[t.exam_type]} - ${t.certification_level})`,
                })),
              ]}
              value={selectedTemplate}
              onChange={setSelectedTemplate}
            />
            {selectedTemplate && (
              <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                {(() => {
                  const template = templates.find((t) => t.id === selectedTemplate);
                  if (!template) return null;
                  return (
                    <div className="space-y-1">
                      <p><strong>Type:</strong> {examTypeLabels[template.exam_type]}</p>
                      <p><strong>Questions:</strong> {template.total_questions}</p>
                      <p><strong>Time Limit:</strong> {template.time_limit_minutes ? `${template.time_limit_minutes} min` : "None"}</p>
                      <p><strong>Passing Score:</strong> {template.passing_score}%</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Exam Title</label>
            <Input
              placeholder="e.g., EMT Midterm Exam"
              value={newExam.title}
              onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description (optional)</label>
            <Input
              placeholder="Brief description of this exam..."
              value={newExam.description}
              onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Available From</label>
              <Input
                type="datetime-local"
                value={newExam.available_from}
                onChange={(e) => setNewExam({ ...newExam, available_from: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Available Until</label>
              <Input
                type="datetime-local"
                value={newExam.available_until}
                onChange={(e) => setNewExam({ ...newExam, available_until: e.target.value })}
              />
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateExam} disabled={!selectedTemplate || !newExam.title}>
            Create Exam
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

interface ExamCardProps {
  exam: StandardizedExam;
  onPublish: () => void;
  onDelete: () => void;
}

function ExamCard({ exam, onPublish, onDelete }: ExamCardProps) {
  const template = exam.template;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${template?.exam_type === "cat" ? "bg-purple-100 dark:bg-purple-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
              {template?.exam_type === "cat" ? (
                <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              ) : (
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <Badge variant={exam.is_published ? "success" : "secondary"}>
              {exam.is_published ? "Published" : "Draft"}
            </Badge>
          </div>
          {template?.certification_level && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${certificationColors[template.certification_level] || "bg-gray-100 text-gray-800"}`}>
              {template.certification_level}
            </span>
          )}
        </div>

        {/* Exam Info */}
        <h3 className="font-semibold text-lg mb-2">{exam.title}</h3>
        {exam.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {exam.description}
          </p>
        )}

        {/* Template Info */}
        {template && (
          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              <span>{template.total_questions} questions</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{template.time_limit_minutes ? `${template.time_limit_minutes} min` : "Untimed"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>{template.passing_score}% to pass</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span>{examTypeLabels[template.exam_type]}</span>
            </div>
          </div>
        )}

        {/* Availability */}
        {(exam.available_from || exam.available_until) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <Calendar className="h-3 w-3" />
            <span>
              {exam.available_from && formatDate(exam.available_from)}
              {exam.available_from && exam.available_until && " - "}
              {exam.available_until && formatDate(exam.available_until)}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/instructor/exams/${exam.id}`}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Link>
          </Button>
          <Button
            variant={exam.is_published ? "secondary" : "default"}
            size="sm"
            className="flex-1"
            onClick={onPublish}
          >
            {exam.is_published ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Unpublish
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Publish
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
