"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Label,
  Textarea,
  Modal,
  Spinner,
  Select,
  Checkbox,
} from "@/components/ui";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Share2,
  BookTemplate,
  Grid3x3,
  ListChecks,
  Target,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useRubrics, type Rubric } from "@/lib/hooks/use-rubrics";
import { formatDate } from "@/lib/utils";

export default function InstructorRubricsPage() {
  const {
    rubrics,
    templates,
    myRubrics,
    isLoading,
    createRubric,
    updateRubric,
    deleteRubric,
    duplicateRubric,
  } = useRubrics();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "my" | "templates" | "shared">("all");
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editingRubric, setEditingRubric] = React.useState<Rubric | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [duplicateModal, setDuplicateModal] = React.useState<Rubric | null>(null);
  const [duplicateTitle, setDuplicateTitle] = React.useState("");

  // Form state
  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    rubric_type: "analytic" as Rubric["rubric_type"],
    is_template: false,
    is_shared: false,
    hide_score_from_students: false,
    free_form_comments_enabled: true,
  });

  const filteredRubrics = React.useMemo(() => {
    let result = rubrics;

    switch (filter) {
      case "my":
        result = myRubrics;
        break;
      case "templates":
        result = templates;
        break;
      case "shared":
        result = rubrics.filter(r => r.is_shared && !r.is_template);
        break;
    }

    if (searchTerm) {
      result = result.filter(r =>
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [rubrics, myRubrics, templates, filter, searchTerm]);

  const handleCreateRubric = async () => {
    const rubric = await createRubric(formData);
    if (rubric) {
      setCreateModalOpen(false);
      resetForm();
    }
  };

  const handleUpdateRubric = async () => {
    if (!editingRubric) return;
    await updateRubric(editingRubric.id, formData);
    setEditingRubric(null);
    resetForm();
  };

  const handleDeleteRubric = async () => {
    if (!deleteConfirm) return;
    await deleteRubric(deleteConfirm);
    setDeleteConfirm(null);
  };

  const handleDuplicate = async () => {
    if (!duplicateModal || !duplicateTitle.trim()) return;
    await duplicateRubric(duplicateModal.id, duplicateTitle);
    setDuplicateModal(null);
    setDuplicateTitle("");
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      rubric_type: "analytic",
      is_template: false,
      is_shared: false,
      hide_score_from_students: false,
      free_form_comments_enabled: true,
    });
  };

  const openEditModal = (rubric: Rubric) => {
    setFormData({
      title: rubric.title,
      description: rubric.description || "",
      rubric_type: rubric.rubric_type,
      is_template: rubric.is_template,
      is_shared: rubric.is_shared,
      hide_score_from_students: rubric.hide_score_from_students,
      free_form_comments_enabled: rubric.free_form_comments_enabled,
    });
    setEditingRubric(rubric);
  };

  const _getRubricTypeIcon = (type: Rubric["rubric_type"]) => {
    switch (type) {
      case "analytic":
        return <Grid3x3 className="h-4 w-4" />;
      case "holistic":
        return <Target className="h-4 w-4" />;
      case "single_point":
        return <ListChecks className="h-4 w-4" />;
    }
  };

  const _getRubricTypeBadge = (type: Rubric["rubric_type"]) => {
    switch (type) {
      case "analytic":
        return <Badge variant="info">Analytic</Badge>;
      case "holistic":
        return <Badge variant="warning">Holistic</Badge>;
      case "single_point":
        return <Badge variant="success">Single Point</Badge>;
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Grid3x3 className="h-6 w-6" />
            Rubrics
          </h1>
          <p className="text-muted-foreground">
            Create and manage grading rubrics for assignments
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Rubric
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{rubrics.length}</div>
            <p className="text-sm text-muted-foreground">Total Rubrics</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{myRubrics.length}</div>
            <p className="text-sm text-muted-foreground">My Rubrics</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-sm text-muted-foreground">Templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {rubrics.filter(r => r.is_shared).length}
            </div>
            <p className="text-sm text-muted-foreground">Shared</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rubrics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filter}
          onChange={(v) => setFilter(v as typeof filter)}
          options={[
            { value: "all", label: "All Rubrics" },
            { value: "my", label: "My Rubrics" },
            { value: "templates", label: "Templates" },
            { value: "shared", label: "Shared" },
          ]}
          className="w-[180px]"
        />
      </div>

      {/* Rubrics List */}
      {filteredRubrics.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Grid3x3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No rubrics found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? "Try adjusting your search terms"
                : "Create your first rubric to get started"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Rubric
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRubrics.map((rubric) => (
            <RubricCard
              key={rubric.id}
              rubric={rubric}
              onEdit={() => openEditModal(rubric)}
              onDelete={() => setDeleteConfirm(rubric.id)}
              onDuplicate={() => {
                setDuplicateModal(rubric);
                setDuplicateTitle(`${rubric.title} (Copy)`);
              }}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={createModalOpen || editingRubric !== null}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingRubric(null);
          resetForm();
        }}
        title={editingRubric ? "Edit Rubric" : "Create Rubric"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Written Assignment Rubric"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the rubric's purpose..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Rubric Type</Label>
            <Select
              value={formData.rubric_type}
              onChange={(v) => setFormData({ ...formData, rubric_type: v as Rubric["rubric_type"] })}
              options={[
                { value: "analytic", label: "Analytic (Multiple criteria with levels)" },
                { value: "holistic", label: "Holistic (Single overall score)" },
                { value: "single_point", label: "Single Point (Pass/Fail criteria)" },
              ]}
            />
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_template"
                checked={formData.is_template}
                onChange={(checked) =>
                  setFormData({ ...formData, is_template: checked as boolean })
                }
              />
              <Label htmlFor="is_template" className="cursor-pointer">
                Save as template
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is_shared"
                checked={formData.is_shared}
                onChange={(checked) =>
                  setFormData({ ...formData, is_shared: checked as boolean })
                }
              />
              <Label htmlFor="is_shared" className="cursor-pointer">
                Share with other instructors
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="hide_score"
                checked={formData.hide_score_from_students}
                onChange={(checked) =>
                  setFormData({ ...formData, hide_score_from_students: checked as boolean })
                }
              />
              <Label htmlFor="hide_score" className="cursor-pointer">
                Hide scores from students
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="free_form"
                checked={formData.free_form_comments_enabled}
                onChange={(checked) =>
                  setFormData({ ...formData, free_form_comments_enabled: checked as boolean })
                }
              />
              <Label htmlFor="free_form" className="cursor-pointer">
                Enable free-form comments
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false);
                setEditingRubric(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingRubric ? handleUpdateRubric : handleCreateRubric}
              disabled={!formData.title.trim()}
            >
              {editingRubric ? "Save Changes" : "Create Rubric"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Rubric"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete this rubric? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRubric}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Duplicate Modal */}
      <Modal
        isOpen={duplicateModal !== null}
        onClose={() => {
          setDuplicateModal(null);
          setDuplicateTitle("");
        }}
        title="Duplicate Rubric"
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New Rubric Title</Label>
            <Input
              value={duplicateTitle}
              onChange={(e) => setDuplicateTitle(e.target.value)}
              placeholder="Enter title for the copy"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDuplicateModal(null);
                setDuplicateTitle("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={!duplicateTitle.trim()}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Rubric Card Component
function RubricCard({
  rubric,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  rubric: Rubric;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  const getRubricTypeIcon = (type: Rubric["rubric_type"]) => {
    switch (type) {
      case "analytic":
        return <Grid3x3 className="h-4 w-4" />;
      case "holistic":
        return <Target className="h-4 w-4" />;
      case "single_point":
        return <ListChecks className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/instructor/rubrics/${rubric.id}`}
                  className="font-medium hover:text-primary"
                >
                  {rubric.title}
                </Link>
                {rubric.is_template && (
                  <Badge variant="secondary">
                    <BookTemplate className="h-3 w-3 mr-1" />
                    Template
                  </Badge>
                )}
                {rubric.is_shared && (
                  <Badge variant="outline">
                    <Share2 className="h-3 w-3 mr-1" />
                    Shared
                  </Badge>
                )}
              </div>
              {rubric.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {rubric.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  {getRubricTypeIcon(rubric.rubric_type)}
                  <span className="capitalize">{rubric.rubric_type.replace("_", " ")}</span>
                </div>
                <span>{rubric.criteria?.length || 0} criteria</span>
                <span>{rubric.total_points || 0} points</span>
                <span>Created {formatDate(rubric.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/instructor/rubrics/${rubric.id}`}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={onDuplicate}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Expanded Criteria Preview */}
        {expanded && rubric.criteria && rubric.criteria.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="space-y-2">
              {rubric.criteria.map((criterion) => (
                <div
                  key={criterion.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium">{criterion.title}</p>
                    {criterion.description && (
                      <p className="text-sm text-muted-foreground">
                        {criterion.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{criterion.points} pts</p>
                    <p className="text-sm text-muted-foreground">
                      {criterion.ratings?.length || 0} levels
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
