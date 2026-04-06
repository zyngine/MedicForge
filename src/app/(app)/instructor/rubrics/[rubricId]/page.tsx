"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Label,
  Textarea,
  Modal,
  Spinner,
} from "@/components/ui";
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Edit,
  Trash2,
  Save,
  Grid3x3,
  Target,
  ListChecks,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useRubricBuilder, type RubricCriterion, type RubricRating } from "@/lib/hooks/use-rubrics";

export default function RubricBuilderPage() {
  const params = useParams();
  const _router = useRouter();
  const rubricId = params.rubricId as string;

  const {
    rubric,
    isLoading,
    addCriterion,
    updateCriterion,
    deleteCriterion,
    addRating,
    updateRating,
    deleteRating,
    reorderCriteria: _reorderCriteria,
  } = useRubricBuilder(rubricId);

  const [criterionModal, setCriterionModal] = React.useState<{
    mode: "create" | "edit";
    criterion?: RubricCriterion;
  } | null>(null);

  const [ratingModal, setRatingModal] = React.useState<{
    mode: "create" | "edit";
    criterionId: string;
    rating?: RubricRating;
  } | null>(null);

  const [criterionForm, setCriterionForm] = React.useState({
    title: "",
    description: "",
    long_description: "",
    points: 10,
  });

  const [ratingForm, setRatingForm] = React.useState({
    title: "",
    description: "",
    points: 0,
  });

  const [expandedCriteria, setExpandedCriteria] = React.useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    type: "criterion" | "rating";
    id: string;
    criterionId?: string;
  } | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedCriteria((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openCriterionModal = (mode: "create" | "edit", criterion?: RubricCriterion) => {
    if (mode === "edit" && criterion) {
      setCriterionForm({
        title: criterion.title,
        description: criterion.description || "",
        long_description: criterion.long_description || "",
        points: criterion.points,
      });
    } else {
      setCriterionForm({ title: "", description: "", long_description: "", points: 10 });
    }
    setCriterionModal({ mode, criterion });
  };

  const openRatingModal = (
    mode: "create" | "edit",
    criterionId: string,
    rating?: RubricRating
  ) => {
    if (mode === "edit" && rating) {
      setRatingForm({
        title: rating.title,
        description: rating.description,
        points: rating.points,
      });
    } else {
      const criterion = rubric?.criteria?.find((c) => c.id === criterionId);
      setRatingForm({
        title: "",
        description: "",
        points: criterion?.points || 0,
      });
    }
    setRatingModal({ mode, criterionId, rating });
  };

  const handleSaveCriterion = async () => {
    if (!criterionModal) return;

    if (criterionModal.mode === "create") {
      await addCriterion({
        title: criterionForm.title,
        description: criterionForm.description || undefined,
        points: criterionForm.points,
      });
    } else if (criterionModal.criterion) {
      await updateCriterion(criterionModal.criterion.id, {
        title: criterionForm.title,
        description: criterionForm.description || null,
        long_description: criterionForm.long_description || null,
        points: criterionForm.points,
      });
    }

    setCriterionModal(null);
  };

  const handleSaveRating = async () => {
    if (!ratingModal) return;

    if (ratingModal.mode === "create") {
      await addRating(ratingModal.criterionId, {
        title: ratingForm.title,
        description: ratingForm.description,
        points: ratingForm.points,
      });
    } else if (ratingModal.rating) {
      await updateRating(ratingModal.rating.id, {
        title: ratingForm.title,
        description: ratingForm.description,
        points: ratingForm.points,
      });
    }

    setRatingModal(null);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    if (deleteConfirm.type === "criterion") {
      await deleteCriterion(deleteConfirm.id);
    } else {
      await deleteRating(deleteConfirm.id);
    }

    setDeleteConfirm(null);
  };

  const getRubricTypeIcon = () => {
    switch (rubric?.rubric_type) {
      case "analytic":
        return <Grid3x3 className="h-5 w-5" />;
      case "holistic":
        return <Target className="h-5 w-5" />;
      case "single_point":
        return <ListChecks className="h-5 w-5" />;
      default:
        return <Grid3x3 className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!rubric) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Rubric not found</h2>
        <Button asChild>
          <Link href="/instructor/rubrics">Back to Rubrics</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/instructor/rubrics">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {getRubricTypeIcon()}
            <h1 className="text-2xl font-bold">{rubric.title}</h1>
          </div>
          {rubric.description && (
            <p className="text-muted-foreground">{rubric.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline" className="capitalize">
              {rubric.rubric_type.replace("_", " ")}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {rubric.criteria?.length || 0} criteria
            </span>
            <span className="text-sm font-medium">
              {rubric.total_points || 0} total points
            </span>
          </div>
        </div>
        <Button onClick={() => openCriterionModal("create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Criterion
        </Button>
      </div>

      {/* Criteria List */}
      {!rubric.criteria || rubric.criteria.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Grid3x3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No criteria yet</h3>
            <p className="text-muted-foreground mb-4">
              Add criteria to define what you&apos;ll evaluate
            </p>
            <Button onClick={() => openCriterionModal("create")}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Criterion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(rubric.criteria || []).map((criterion, index) => (
            <CriterionCard
              key={criterion.id}
              criterion={criterion}
              index={index}
              isExpanded={expandedCriteria.has(criterion.id)}
              onToggle={() => toggleExpanded(criterion.id)}
              onEdit={() => openCriterionModal("edit", criterion)}
              onDelete={() =>
                setDeleteConfirm({ type: "criterion", id: criterion.id })
              }
              onAddRating={() => openRatingModal("create", criterion.id)}
              onEditRating={(rating) =>
                openRatingModal("edit", criterion.id, rating)
              }
              onDeleteRating={(ratingId) =>
                setDeleteConfirm({
                  type: "rating",
                  id: ratingId,
                  criterionId: criterion.id,
                })
              }
            />
          ))}
        </div>
      )}

      {/* Rubric Preview */}
      {rubric.criteria && rubric.criteria.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rubric Preview</CardTitle>
            <CardDescription>
              How the rubric will appear when grading
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-3 bg-muted text-left font-medium">
                      Criteria
                    </th>
                    {rubric.rubric_type === "analytic" && (
                      <>
                        {/* Find max number of ratings */}
                        {Array.from(
                          {
                            length: Math.max(
                              ...(rubric.criteria || []).map(
                                (c) => c.ratings?.length || 0
                              ),
                              4
                            ),
                          },
                          (_, i) => (
                            <th
                              key={i}
                              className="border p-3 bg-muted text-center font-medium min-w-[150px]"
                            >
                              Level {i + 1}
                            </th>
                          )
                        )}
                      </>
                    )}
                    <th className="border p-3 bg-muted text-center font-medium w-20">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(rubric.criteria || []).map((criterion) => (
                    <tr key={criterion.id}>
                      <td className="border p-3 align-top">
                        <p className="font-medium">{criterion.title}</p>
                        {criterion.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {criterion.description}
                          </p>
                        )}
                      </td>
                      {rubric.rubric_type === "analytic" && (
                        <>
                          {criterion.ratings?.map((rating) => (
                            <td
                              key={rating.id}
                              className="border p-3 align-top text-center"
                            >
                              <p className="font-medium text-sm">
                                {rating.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {rating.description}
                              </p>
                              <Badge variant="outline" className="mt-2">
                                {rating.points} pts
                              </Badge>
                            </td>
                          ))}
                          {/* Fill empty cells */}
                          {Array.from(
                            {
                              length:
                                Math.max(
                                  ...(rubric.criteria || []).map(
                                    (c) => c.ratings?.length || 0
                                  ),
                                  4
                                ) - (criterion.ratings?.length || 0),
                            },
                            (_, i) => (
                              <td
                                key={`empty-${i}`}
                                className="border p-3 text-center text-muted-foreground"
                              >
                                -
                              </td>
                            )
                          )}
                        </>
                      )}
                      <td className="border p-3 text-center font-medium">
                        {criterion.points}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted">
                    <td
                      className="border p-3 font-bold text-right"
                      colSpan={
                        rubric.rubric_type === "analytic"
                          ? Math.max(
                              ...(rubric.criteria || []).map(
                                (c) => c.ratings?.length || 0
                              ),
                              4
                            ) + 1
                          : 1
                      }
                    >
                      Total Points:
                    </td>
                    <td className="border p-3 text-center font-bold">
                      {rubric.total_points || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Criterion Modal */}
      <Modal
        isOpen={criterionModal !== null}
        onClose={() => setCriterionModal(null)}
        title={
          criterionModal?.mode === "create" ? "Add Criterion" : "Edit Criterion"
        }
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={criterionForm.title}
              onChange={(e) =>
                setCriterionForm({ ...criterionForm, title: e.target.value })
              }
              placeholder="e.g., Content Quality"
            />
          </div>

          <div className="space-y-2">
            <Label>Short Description</Label>
            <Input
              value={criterionForm.description}
              onChange={(e) =>
                setCriterionForm({
                  ...criterionForm,
                  description: e.target.value,
                })
              }
              placeholder="Brief description of what is evaluated"
            />
          </div>

          <div className="space-y-2">
            <Label>Detailed Description (Optional)</Label>
            <Textarea
              value={criterionForm.long_description}
              onChange={(e) =>
                setCriterionForm({
                  ...criterionForm,
                  long_description: e.target.value,
                })
              }
              placeholder="Detailed explanation of the criterion..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Maximum Points</Label>
            <Input
              type="number"
              value={criterionForm.points}
              onChange={(e) =>
                setCriterionForm({
                  ...criterionForm,
                  points: parseInt(e.target.value) || 0,
                })
              }
              min={0}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCriterionModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCriterion}
              disabled={!criterionForm.title.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              {criterionModal?.mode === "create" ? "Add Criterion" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rating Modal */}
      <Modal
        isOpen={ratingModal !== null}
        onClose={() => setRatingModal(null)}
        title={ratingModal?.mode === "create" ? "Add Rating Level" : "Edit Rating"}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Level Title</Label>
            <Input
              value={ratingForm.title}
              onChange={(e) =>
                setRatingForm({ ...ratingForm, title: e.target.value })
              }
              placeholder="e.g., Excellent, Good, Needs Improvement"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={ratingForm.description}
              onChange={(e) =>
                setRatingForm({ ...ratingForm, description: e.target.value })
              }
              placeholder="Describe what this level looks like..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Points</Label>
            <Input
              type="number"
              value={ratingForm.points}
              onChange={(e) =>
                setRatingForm({
                  ...ratingForm,
                  points: parseInt(e.target.value) || 0,
                })
              }
              min={0}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setRatingModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRating}
              disabled={!ratingForm.title.trim() || !ratingForm.description.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              {ratingModal?.mode === "create" ? "Add Rating" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={`Delete ${deleteConfirm?.type === "criterion" ? "Criterion" : "Rating"}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Are you sure you want to delete this{" "}
            {deleteConfirm?.type === "criterion" ? "criterion" : "rating level"}?
            {deleteConfirm?.type === "criterion" &&
              " All associated ratings will also be deleted."}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Criterion Card Component
function CriterionCard({
  criterion,
  index,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddRating,
  onEditRating,
  onDeleteRating,
}: {
  criterion: RubricCriterion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddRating: () => void;
  onEditRating: (rating: RubricRating) => void;
  onDeleteRating: (ratingId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 pt-1">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <button
              onClick={onToggle}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">
                    #{index + 1}
                  </span>
                  <h3 className="font-medium">{criterion.title}</h3>
                  <Badge variant="outline">{criterion.points} pts</Badge>
                </div>
                {criterion.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {criterion.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Expanded Ratings */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Rating Levels</h4>
                  <Button size="sm" variant="outline" onClick={onAddRating}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Level
                  </Button>
                </div>

                {!criterion.ratings || criterion.ratings.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No rating levels defined. Add levels to define performance standards.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {criterion.ratings.map((rating, ratingIndex) => (
                      <div
                        key={rating.id}
                        className="flex items-start justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {criterion.ratings!.length - ratingIndex}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {rating.title}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {rating.points} pts
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {rating.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditRating(rating)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteRating(rating.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Add Common Levels */}
                {(!criterion.ratings || criterion.ratings.length === 0) && (
                  <div className="p-4 border border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground mb-3">
                      Quick start with common rating levels:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                      >
                        4-Level Scale
                      </Badge>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                      >
                        5-Level Scale
                      </Badge>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                      >
                        Pass/Fail
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
