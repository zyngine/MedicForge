"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Textarea,
} from "@/components/ui";
import { ArrowLeft, Plus } from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";

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

interface FormState {
  name: string;
  description: string;
  category: string;
  customCategory: string;
  skill_code: string;
  certification_levels: string[];
  is_required: boolean;
}

const initialForm: FormState = {
  name: "",
  description: "",
  category: "",
  customCategory: "",
  skill_code: "",
  certification_levels: [],
  is_required: true,
};

export default function NewSkillPage() {
  const { isAgencyAdmin } = useAgencyRole();
  const router = useRouter();

  const [form, setForm] = React.useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);

  // Redirect non-admins away
  React.useEffect(() => {
    if (isAgencyAdmin === false) {
      router.push("/agency/skills");
    }
  }, [isAgencyAdmin, router]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
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
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) {
      newErrors.name = "Skill name is required.";
    }
    const resolvedCategory =
      form.category === "__custom__" ? form.customCategory.trim() : form.category;
    if (!resolvedCategory) {
      newErrors.category = "Category is required.";
    }
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
      const res = await fetch("/api/agency/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      router.push("/agency/skills");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Failed to create skill.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isCustomCategory = form.category === "__custom__";

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
      <div>
        <h1 className="text-2xl font-bold">Add Custom Skill</h1>
        <p className="text-muted-foreground mt-1">
          Define a new competency requirement for your agency.
        </p>
      </div>

      {/* Form card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skill Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Skill Name <span className="text-error">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. IV Access"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-error">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the skill and its requirements..."
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-error">*</span>
              </Label>
              <Select
                id="category"
                options={CATEGORY_OPTIONS}
                placeholder="Select a category"
                value={form.category}
                onChange={(val) => setField("category", val)}
                disabled={isSubmitting}
              />
              {isCustomCategory && (
                <Input
                  id="customCategory"
                  placeholder="Enter custom category name"
                  value={form.customCategory}
                  onChange={(e) => setField("customCategory", e.target.value)}
                  disabled={isSubmitting}
                  className="mt-2"
                />
              )}
              {errors.category && (
                <p className="text-sm text-error">{errors.category}</p>
              )}
            </div>

            {/* Skill Code */}
            <div className="space-y-2">
              <Label htmlFor="skill_code">Skill Code</Label>
              <Input
                id="skill_code"
                placeholder="e.g. AIRWAY-001"
                value={form.skill_code}
                onChange={(e) => setField("skill_code", e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Optional internal reference code for this skill.
              </p>
            </div>

            {/* Certification Levels */}
            <div className="space-y-3">
              <Label>Certification Levels</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Select which certification levels this skill applies to.
              </p>
              <div className="flex flex-wrap gap-4">
                {CERTIFICATION_LEVELS.map((level) => (
                  <Checkbox
                    key={level}
                    id={`cert-${level}`}
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
                id="is_required"
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
                <Plus className="h-4 w-4 mr-2" />
                Add Skill
              </Button>
              <Button asChild variant="outline" disabled={isSubmitting}>
                <Link href="/agency/skills">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
