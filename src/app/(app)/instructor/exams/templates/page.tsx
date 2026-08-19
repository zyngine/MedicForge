"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Textarea,
  Label,
  Checkbox,
  Modal,
  ModalFooter,
  Spinner,
} from "@/components/ui";
import {
  Plus,
  ArrowLeft,
  Brain,
  ClipboardList,
  Clock,
  Target,
  Edit,
  Trash2,
  Settings,
  HelpCircle,
} from "lucide-react";
import {
  useExamTemplates,
  type ExamTemplate,
  type ExamType,
  type DeliveryMode,
  type CATSettings,
} from "@/lib/hooks/use-standardized-exams";

const certificationLevels = [
  { value: "EMR", label: "Emergency Medical Responder (EMR)" },
  { value: "EMT", label: "Emergency Medical Technician (EMT)" },
  { value: "AEMT", label: "Advanced EMT (AEMT)" },
  { value: "Paramedic", label: "Paramedic" },
];

const certificationColors: Record<string, string> = {
  EMR: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  EMT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  AEMT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Paramedic: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const examTypeOptions: Array<{ value: ExamType; label: string }> = [
  { value: "practice", label: "Practice" },
  { value: "unit", label: "Unit / Module Exam" },
  { value: "comprehensive", label: "Comprehensive / Final" },
  { value: "entrance", label: "Entrance / Pre-Admission" },
  { value: "remediation", label: "Remediation" },
];

const deliveryModeOptions: Array<{ value: DeliveryMode; label: string }> = [
  { value: "standard", label: "Standard (fixed question count)" },
  { value: "adaptive", label: "Adaptive (CAT)" },
];

interface TemplateFormData {
  name: string;
  description: string;
  exam_type: ExamType;
  delivery_mode: DeliveryMode;
  certification_level: string;
  total_questions: number;
  min_questions: number | null;
  max_questions: number | null;
  time_limit_minutes: number | null;
  passing_score: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_results_immediately: boolean;
  show_correct_answers: boolean;
  allow_review: boolean;
  cat_settings: CATSettings | null;
}

const defaultCATSettings: CATSettings = {
  initial_theta: 0,
  termination_se: 0.3,
};

const defaultFormData: TemplateFormData = {
  name: "",
  description: "",
  exam_type: "practice",
  delivery_mode: "standard",
  certification_level: "EMT",
  total_questions: 100,
  min_questions: null,
  max_questions: null,
  time_limit_minutes: 120,
  passing_score: 70,
  shuffle_questions: true,
  shuffle_options: true,
  show_results_immediately: true,
  show_correct_answers: false,
  allow_review: true,
  cat_settings: null,
};

export default function ExamTemplatesPage() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } =
    useExamTemplates();
  const [showModal, setShowModal] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<ExamTemplate | null>(null);
  const [formData, setFormData] = React.useState<TemplateFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData(defaultFormData);
    setSubmitError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (template: ExamTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      exam_type: template.exam_type,
      delivery_mode: template.delivery_mode,
      certification_level: template.certification_level,
      total_questions: template.total_questions,
      min_questions: template.min_questions,
      max_questions: template.max_questions,
      time_limit_minutes: template.time_limit_minutes,
      passing_score: template.passing_score,
      shuffle_questions: template.shuffle_questions,
      shuffle_options: template.shuffle_options,
      show_results_immediately: template.show_results_immediately,
      show_correct_answers: template.show_correct_answers,
      allow_review: template.allow_review,
      cat_settings: template.cat_settings,
    });
    setSubmitError(null);
    setShowModal(true);
  };

  // When switching between standard and adaptive delivery, apply CAT defaults
  // to avoid submitting stale/null CAT fields the DB expects for adaptive exams.
  const handleDeliveryModeChange = (mode: DeliveryMode) => {
    setFormData((prev) => ({
      ...prev,
      delivery_mode: mode,
      min_questions: mode === "adaptive" ? prev.min_questions ?? 70 : null,
      max_questions: mode === "adaptive" ? prev.max_questions ?? 120 : null,
      cat_settings: mode === "adaptive" ? prev.cat_settings ?? defaultCATSettings : null,
      // Adaptive exams typically don't have a hard time limit
      time_limit_minutes: mode === "adaptive" ? null : prev.time_limit_minutes,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.certification_level) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        ...formData,
        description: formData.description || null,
      };
      if (editingTemplate) {
        const ok = await updateTemplate(editingTemplate.id, payload);
        if (!ok) {
          setSubmitError("Failed to save changes.");
          return;
        }
      } else {
        const created = await createTemplate({ ...payload, is_active: true });
        if (!created) {
          setSubmitError("Failed to create template. Check that all required fields are filled in.");
          return;
        }
      }
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this template? This cannot be undone.")) {
      await deleteTemplate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const isAdaptive = formData.delivery_mode === "adaptive";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/instructor/exams">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exams
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Exam Templates</h1>
          <p className="text-muted-foreground">
            Create and manage reusable exam templates including CAT (Computer Adaptive Testing) configurations.
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">About Exam Templates</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Templates define the structure and rules for exams. Once created, you can use templates to create
                multiple exam instances. Adaptive (CAT) templates use Item Response Theory (IRT) to adaptively select
                questions based on student ability, similar to the actual NREMT exam.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first exam template to start building standardized exams.
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleOpenEdit(template)}
              onDelete={() => handleDelete(template.id)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTemplate ? "Edit Template" : "Create Exam Template"}
        description={
          editingTemplate
            ? "Update the template configuration"
            : "Configure a new exam template for standardized testing"
        }
        size="lg"
      >
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {submitError && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {submitError}
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" required>Template Name</Label>
              <Input
                id="name"
                placeholder="e.g., EMT Certification Practice Exam"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this exam template..."
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="certification_level" required>Certification Level</Label>
                <Select
                  id="certification_level"
                  options={certificationLevels}
                  value={formData.certification_level}
                  onChange={(value) => setFormData((prev) => ({ ...prev, certification_level: value }))}
                />
              </div>
              <div>
                <Label htmlFor="exam_type" required>Exam Type</Label>
                <Select
                  id="exam_type"
                  options={examTypeOptions}
                  value={formData.exam_type}
                  onChange={(value) => setFormData((prev) => ({ ...prev, exam_type: value as ExamType }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  What phase of the program this exam covers
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="delivery_mode" required>Delivery Mode</Label>
              <Select
                id="delivery_mode"
                options={deliveryModeOptions}
                value={formData.delivery_mode}
                onChange={(value) => handleDeliveryModeChange(value as DeliveryMode)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Standard = every student sees the same number of questions. Adaptive = length varies based on ability.
              </p>
            </div>
          </div>

          {/* Exam Settings */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Exam Settings</h4>

            <div className="grid grid-cols-2 gap-4">
              {!isAdaptive ? (
                <div>
                  <Label htmlFor="total_questions">Total Questions</Label>
                  <Input
                    id="total_questions"
                    type="number"
                    min={1}
                    value={formData.total_questions}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, total_questions: parseInt(e.target.value) || 1 }))
                    }
                  />
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="min_questions">Min Questions (CAT)</Label>
                    <Input
                      id="min_questions"
                      type="number"
                      min={10}
                      value={formData.min_questions ?? 70}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          min_questions: parseInt(e.target.value) || 70,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_questions">Max Questions (CAT)</Label>
                    <Input
                      id="max_questions"
                      type="number"
                      min={20}
                      value={formData.max_questions ?? 120}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 120;
                        setFormData((prev) => ({
                          ...prev,
                          max_questions: value,
                          // Keep total_questions in sync with the cap so anything
                          // that reads it as a display value still makes sense
                          total_questions: value,
                        }));
                      }}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                <Input
                  id="time_limit"
                  type="number"
                  min={0}
                  placeholder="Leave empty for no limit"
                  value={formData.time_limit_minutes ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      time_limit_minutes: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="passing_score">Passing Score (%)</Label>
                <Input
                  id="passing_score"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.passing_score}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, passing_score: parseInt(e.target.value) || 70 }))
                  }
                />
              </div>
            </div>
          </div>

          {/* CAT-specific settings */}
          {isAdaptive && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium">CAT Configuration</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure Item Response Theory (IRT) parameters for adaptive testing. The exam will adjust
                difficulty based on student performance, terminating when ability estimate is precise enough.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="initial_theta">Initial Ability (Theta)</Label>
                  <Input
                    id="initial_theta"
                    type="number"
                    step="0.1"
                    value={formData.cat_settings?.initial_theta ?? 0}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cat_settings: {
                          ...defaultCATSettings,
                          ...prev.cat_settings,
                          initial_theta: parseFloat(e.target.value) || 0,
                        },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Starting ability estimate (0 = average)
                  </p>
                </div>

                <div>
                  <Label htmlFor="termination_se">Termination SE</Label>
                  <Input
                    id="termination_se"
                    type="number"
                    step="0.05"
                    min={0.1}
                    max={1}
                    value={formData.cat_settings?.termination_se ?? 0.3}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cat_settings: {
                          ...defaultCATSettings,
                          ...prev.cat_settings,
                          termination_se: parseFloat(e.target.value) || 0.3,
                        },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Stop when standard error falls below this (lower = more precise)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Options</h4>

            <div className="space-y-3">
              <Checkbox
                id="shuffle_questions"
                checked={formData.shuffle_questions}
                onChange={(checked) => setFormData((prev) => ({ ...prev, shuffle_questions: checked }))}
                label="Randomize question order"
              />

              <Checkbox
                id="shuffle_options"
                checked={formData.shuffle_options}
                onChange={(checked) => setFormData((prev) => ({ ...prev, shuffle_options: checked }))}
                label="Randomize answer options"
              />

              <Checkbox
                id="show_results"
                checked={formData.show_results_immediately}
                onChange={(checked) =>
                  setFormData((prev) => ({ ...prev, show_results_immediately: checked }))
                }
                label="Show results immediately after completion"
              />

              <Checkbox
                id="show_correct_answers"
                checked={formData.show_correct_answers}
                onChange={(checked) =>
                  setFormData((prev) => ({ ...prev, show_correct_answers: checked }))
                }
                label="Show correct answers after completion"
              />

              <Checkbox
                id="allow_review"
                checked={formData.allow_review}
                onChange={(checked) => setFormData((prev) => ({ ...prev, allow_review: checked }))}
                label="Allow students to review answers after completion"
              />
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowModal(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.name}>
            {isSubmitting ? "Saving..." : editingTemplate ? "Save Changes" : "Create Template"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

interface TemplateCardProps {
  template: ExamTemplate;
  onEdit: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const isAdaptive = template.delivery_mode === "adaptive";
  const examTypeLabel =
    examTypeOptions.find((o) => o.value === template.exam_type)?.label || template.exam_type;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isAdaptive ? "bg-purple-100 dark:bg-purple-900/30" : "bg-blue-100 dark:bg-blue-900/30"
              }`}
            >
              {isAdaptive ? (
                <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              ) : (
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Badge variant={isAdaptive ? "default" : "secondary"}>
                {isAdaptive ? "CAT" : "Standard"}
              </Badge>
              <span className="text-xs text-muted-foreground">{examTypeLabel}</span>
            </div>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              certificationColors[template.certification_level] || "bg-gray-100 text-gray-800"
            }`}
          >
            {template.certification_level}
          </span>
        </div>

        {/* Info */}
        <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
        {template.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{template.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            <span>
              {isAdaptive && template.min_questions != null && template.max_questions != null
                ? `${template.min_questions}-${template.max_questions}`
                : template.total_questions}{" "}
              questions
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{template.time_limit_minutes ? `${template.time_limit_minutes} min` : "Untimed"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>{template.passing_score}% to pass</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
