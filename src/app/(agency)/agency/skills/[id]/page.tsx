"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
  Checkbox,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import { ArrowLeft, Edit2, Trash2, Save, X, Lock } from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";
import { useAgencySkills } from "@/lib/hooks/use-agency-data";
import type { AgencySkill } from "@/lib/hooks/use-agency-data";

const PRESET_CATEGORIES = [
  "Airway Management",
  "Cardiac",
  "Trauma",
  "Medical",
  "OB/GYN",
  "Pediatrics",
  "Operations",
  "Other",
];

const CERTIFICATION_LEVELS = ["EMR", "EMT", "AEMT", "Paramedic"] as const;

const CATEGORY_OPTIONS = [
  ...PRESET_CATEGORIES.map((c) => ({ value: c, label: c })),
  { value: "__custom__", label: "Custom..." },
];

interface EditFormState {
  name: string;
  description: string;
  category: string;
  customCategory: string;
  skill_code: string;
  certification_levels: string[];
  is_required: boolean;
}

function skillToForm(skill: AgencySkill & { skill_code?: string | null }): EditFormState {
  const isPreset = PRESET_CATEGORIES.includes(skill.category);
  return {
    name: skill.name,
    description: skill.description ?? "",
    category: isPreset ? skill.category : "__custom__",
    customCategory: isPreset ? "" : skill.category,
    skill_code: skill.skill_code ?? "",
    certification_levels: skill.certification_levels ?? [],
    is_required: skill.is_required ?? false,
  };
}

// ─── Read-only view for system-default skills ─────────────────────────────────

function SkillReadOnly({ skill }: { skill: AgencySkill & { skill_code?: string | null; is_system_default?: boolean } }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle className="text-base">Skill Details</CardTitle>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          System default — read only
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Name</p>
          <p className="text-sm font-medium">{skill.name}</p>
        </div>

        {skill.description && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Description</p>
            <p className="text-sm">{skill.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Category</p>
            <p className="text-sm">{skill.category}</p>
          </div>
          {skill.skill_code && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Skill Code</p>
              <p className="text-sm font-mono">{skill.skill_code}</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Certification Levels</p>
          <div className="flex flex-wrap gap-1">
            {skill.certification_levels?.length > 0 ? (
              skill.certification_levels.map((level) => (
                <Badge key={level} variant="secondary" className="text-xs">
                  {level}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">None specified</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-1 text-sm">
          <span className={skill.is_required ? "text-foreground font-medium" : "text-muted-foreground"}>
            {skill.is_required ? "Required" : "Optional"}
          </span>
          {skill.is_system_default && (
            <Badge variant="secondary" className="text-xs">System Default</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Editable form for tenant-owned skills ────────────────────────────────────

interface EditFormProps {
  skill: AgencySkill & { skill_code?: string | null };
  onSaved: () => void;
  onCancel: () => void;
}

function SkillEditForm({ skill, onSaved, onCancel }: EditFormProps) {
  const [form, setForm] = React.useState<EditFormState>(() => skillToForm(skill));
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof EditFormState, string>>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);

  function setField<K extends keyof EditFormState>(key: K, value: EditFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleCertLevel(level: string) {
    setForm((prev) => ({
      ...prev,
      certification_levels: prev.certification_levels.includes(level)
        ? prev.certification_levels.filter((l) => l !== level)
        : [...prev.certification_levels, level],
    }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof EditFormState, string>> = {};
    if (!form.name.trim()) newErrors.name = "Skill name is required.";
    const resolvedCategory =
      form.category === "__custom__" ? form.customCategory.trim() : form.category;
    if (!resolvedCategory) newErrors.category = "Category is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    const resolvedCategory =
      form.category === "__custom__" ? form.customCategory.trim() : form.category;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: resolvedCategory,
      skill_code: form.skill_code.trim() || null,
      certification_levels: form.certification_levels,
      is_required: form.is_required,
    };

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/agency/skills/${skill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      onSaved();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to update skill.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCustomCategory = form.category === "__custom__";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit Skill</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">
              Skill Name <span className="text-error">*</span>
            </Label>
            <Input
              id="edit-name"
              placeholder="e.g. IV Access"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-sm text-error">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Brief description of the skill..."
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="edit-category">
              Category <span className="text-error">*</span>
            </Label>
            <Select
              id="edit-category"
              options={CATEGORY_OPTIONS}
              placeholder="Select a category"
              value={form.category}
              onChange={(val) => setField("category", val)}
              disabled={isSubmitting}
            />
            {isCustomCategory && (
              <Input
                id="edit-customCategory"
                placeholder="Enter custom category name"
                value={form.customCategory}
                onChange={(e) => setField("customCategory", e.target.value)}
                disabled={isSubmitting}
                className="mt-2"
              />
            )}
            {errors.category && <p className="text-sm text-error">{errors.category}</p>}
          </div>

          {/* Skill Code */}
          <div className="space-y-2">
            <Label htmlFor="edit-skill_code">Skill Code</Label>
            <Input
              id="edit-skill_code"
              placeholder="e.g. AIRWAY-001"
              value={form.skill_code}
              onChange={(e) => setField("skill_code", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Certification Levels */}
          <div className="space-y-3">
            <Label>Certification Levels</Label>
            <div className="flex flex-wrap gap-4">
              {CERTIFICATION_LEVELS.map((level) => (
                <Checkbox
                  key={level}
                  id={`edit-cert-${level}`}
                  label={level}
                  checked={form.certification_levels.includes(level)}
                  onChange={() => toggleCertLevel(level)}
                  disabled={isSubmitting}
                />
              ))}
            </div>
            {form.certification_levels.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {form.certification_levels.map((level) => (
                  <Badge key={level} variant="secondary" className="text-xs">
                    {level}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Is Required */}
          <div className="space-y-2">
            <Checkbox
              id="edit-is_required"
              label="Required skill"
              description="Mark this skill as mandatory for all applicable personnel."
              checked={form.is_required}
              onChange={(checked) => setField("is_required", checked)}
              disabled={isSubmitting}
            />
          </div>

          {/* Server error */}
          {serverError && (
            <div className="rounded-md bg-error/10 border border-error/30 px-4 py-3 text-sm text-error">
              {serverError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SkillDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { isAgencyAdmin } = useAgencyRole();
  const { skills, isLoading, refetch } = useAgencySkills();

  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const skill = skills.find((s) => s.id === id) as
    | (AgencySkill & { skill_code?: string | null; is_system_default?: boolean })
    | undefined;

  const isSystemDefault = skill?.is_system_default === true;
  const canEdit = isAgencyAdmin && !isSystemDefault;

  async function handleDelete() {
    if (!skill) return;
    if (!window.confirm(`Delete "${skill.name}"? This cannot be undone.`)) return;

    setDeleteError(null);
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agency/skills/${skill.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      router.push("/agency/skills");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete skill.");
      setIsDeleting(false);
    }
  }

  function handleSaved() {
    refetch();
    setIsEditing(false);
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── Not found ──
  if (!skill) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/agency/skills">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Skills
          </Link>
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="font-medium">Skill not found.</p>
            <p className="text-sm mt-1">
              It may have been deleted or you may not have access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back link */}
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/agency/skills">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Skills
          </Link>
        </Button>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{skill.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">{skill.category}</p>
        </div>
        {canEdit && !isEditing && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              isLoading={isDeleting}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Delete error */}
      {deleteError && (
        <div className="rounded-md bg-error/10 border border-error/30 px-4 py-3 text-sm text-error">
          {deleteError}
        </div>
      )}

      {/* Content — read-only or edit form */}
      {isEditing && canEdit ? (
        <SkillEditForm
          skill={skill}
          onSaved={handleSaved}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <SkillReadOnly skill={skill} />
      )}
    </div>
  );
}
