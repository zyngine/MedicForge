"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Spinner,
  Select,
} from "@/components/ui";
import {
  useSkillsByCategory,
  useCreateSkill,
  useUpdateSkill,
  useDeactivateSkill,
  useSkillLibraryStats,
  Skill,
  CreateSkillInput,
} from "@/lib/hooks/use-skill-library";
import {
  Search,
  Plus,
  BookOpen,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";

const CERTIFICATION_LEVELS = ["EMR", "EMT", "AEMT", "Paramedic"] as const;
const DEFAULT_CATEGORIES = [
  "Airway",
  "Assessment",
  "Cardiac",
  "Vascular Access",
  "Trauma",
  "Medical",
  "Pediatric",
  "OB/GYN",
];

export default function SkillsLibraryPage() {
  const [search, setSearch] = React.useState("");
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [editingSkill, setEditingSkill] = React.useState<Skill | null>(null);

  const { data: categories, isLoading } = useSkillsByCategory({ isActive: true });
  const { data: stats } = useSkillLibraryStats();
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const deactivateSkill = useDeactivateSkill();

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    if (categories) {
      setExpandedCategories(new Set(categories.map((c) => c.name)));
    }
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const filteredCategories = React.useMemo(() => {
    if (!categories) return [];
    if (!search) return categories;

    const searchLower = search.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        skills: cat.skills.filter(
          (skill) =>
            skill.name.toLowerCase().includes(searchLower) ||
            skill.description?.toLowerCase().includes(searchLower)
        ),
      }))
      .filter((cat) => cat.skills.length > 0);
  }, [categories, search]);

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
          <h1 className="text-2xl font-bold">Skills Library</h1>
          <p className="text-muted-foreground">
            Manage competencies that employees must verify
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Skill
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
            <p className="text-sm text-muted-foreground">Active Skills</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.categoryCount || 0}</div>
            <p className="text-sm text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.requiresMdVerification || 0}</div>
            <p className="text-sm text-muted-foreground">Require MD Verification</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.stateRequired || 0}</div>
            <p className="text-sm text-muted-foreground">State Required</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills by Category */}
      <div className="space-y-4">
        {filteredCategories.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No skills found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {search ? "Try a different search term" : "Add your first skill to the library"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCategories.map((category) => (
            <Card key={category.name}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => toggleCategory(category.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {expandedCategories.has(category.name) ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                    <CardTitle>{category.name}</CardTitle>
                    <Badge variant="secondary">{category.count} skills</Badge>
                  </div>
                </div>
              </CardHeader>

              {expandedCategories.has(category.name) && (
                <CardContent>
                  <div className="space-y-3">
                    {category.skills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{skill.name}</h4>
                            {skill.is_system_default && (
                              <Badge variant="outline" className="text-xs">
                                PA Default
                              </Badge>
                            )}
                          </div>
                          {skill.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {skill.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {skill.certification_levels?.map((level) => (
                              <Badge key={level} variant="outline" className="text-xs">
                                {level}
                              </Badge>
                            ))}
                            {skill.requires_annual_verification && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Annual
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSkill(skill);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!skill.is_system_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to remove this skill?")) {
                                  deactivateSkill.mutate(skill.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Skill Modal */}
      {(showAddModal || editingSkill) && (
        <SkillModal
          skill={editingSkill}
          onClose={() => {
            setShowAddModal(false);
            setEditingSkill(null);
          }}
          onSave={async (data) => {
            if (editingSkill) {
              await updateSkill.mutateAsync({ skillId: editingSkill.id, updates: data });
            } else {
              await createSkill.mutateAsync(data);
            }
            setShowAddModal(false);
            setEditingSkill(null);
          }}
        />
      )}
    </div>
  );
}

function SkillModal({
  skill,
  onClose,
  onSave,
}: {
  skill: Skill | null;
  onClose: () => void;
  onSave: (data: CreateSkillInput) => Promise<void>;
}) {
  const [name, setName] = React.useState(skill?.name || "");
  const [description, setDescription] = React.useState(skill?.description || "");
  const [category, setCategory] = React.useState(skill?.category || DEFAULT_CATEGORIES[0]);
  const [certLevels, setCertLevels] = React.useState<string[]>(
    skill?.certification_levels || ["EMT"]
  );
  const [requiresAnnualVerification, setRequiresAnnualVerification] = React.useState(
    skill?.requires_annual_verification ?? true
  );
  const [isRequired, setIsRequired] = React.useState(skill?.is_required ?? true);
  const [saving, setSaving] = React.useState(false);

  const toggleCertLevel = (level: string) => {
    if (certLevels.includes(level)) {
      setCertLevels(certLevels.filter((l) => l !== level));
    } else {
      setCertLevels([...certLevels, level]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || certLevels.length === 0) return;

    setSaving(true);
    try {
      await onSave({
        name,
        description,
        category,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        certification_levels: certLevels as any,
        requires_annual_verification: requiresAnnualVerification,
        is_required: isRequired,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{skill ? "Edit Skill" : "Add New Skill"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Skill Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., IV Insertion"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the skill"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Category *</label>
              <Select
                value={category}
                options={DEFAULT_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                onChange={(value) => setCategory(value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Required For *</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CERTIFICATION_LEVELS.map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={certLevels.includes(level) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCertLevel(level)}
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={requiresAnnualVerification}
                  onChange={(e) => setRequiresAnnualVerification(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Requires Annual Verification</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">State Required</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !name || certLevels.length === 0}>
                {saving ? "Saving..." : skill ? "Update Skill" : "Add Skill"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
