"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Modal,
  Label,
  Select,
  Spinner,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  Alert,
} from "@/components/ui";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  BookOpen,
  Calendar,
  GraduationCap,
} from "lucide-react";
import { useCohorts, type Cohort, type CreateCohortData } from "@/lib/hooks/use-cohorts";
import { formatDate } from "@/lib/utils";

const COURSE_TYPES = [
  { value: "", label: "Select type..." },
  { value: "EMR", label: "EMR" },
  { value: "EMT", label: "EMT" },
  { value: "AEMT", label: "AEMT" },
  { value: "Paramedic", label: "Paramedic" },
  { value: "Custom", label: "Custom" },
];

export default function AdminCohortsPage() {
  const {
    cohorts,
    isLoading,
    createCohort,
    updateCohort,
    deleteCohort,
    isCreating,
    isDeleting: _isDeleting,
  } = useCohorts();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateCohortData>({
    name: "",
    description: "",
    course_type: "",
    start_date: "",
    expected_graduation: "",
    max_students: undefined,
  });

  const filteredCohorts = cohorts.filter((cohort) =>
    cohort.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cohort.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      course_type: "",
      start_date: "",
      expected_graduation: "",
      max_students: undefined,
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      setError("Cohort name is required");
      return;
    }

    try {
      await createCohort(formData);
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create cohort");
    }
  };

  const handleUpdate = async () => {
    if (!editingCohort || !formData.name.trim()) {
      setError("Cohort name is required");
      return;
    }

    try {
      await updateCohort({ id: editingCohort.id, data: formData });
      setEditingCohort(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update cohort");
    }
  };

  const handleDelete = async (cohort: Cohort) => {
    if (!confirm(`Are you sure you want to delete "${cohort.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCohort(cohort.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete cohort");
    }
  };

  const openEditModal = (cohort: Cohort) => {
    setFormData({
      name: cohort.name,
      description: cohort.description || "",
      course_type: cohort.course_type || "",
      start_date: cohort.start_date || "",
      expected_graduation: cohort.expected_graduation || "",
      max_students: cohort.max_students || undefined,
    });
    setEditingCohort(cohort);
  };

  const getStatusBadge = (cohort: Cohort) => {
    if (!cohort.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    const now = new Date();
    const startDate = cohort.start_date ? new Date(cohort.start_date) : null;
    const gradDate = cohort.expected_graduation ? new Date(cohort.expected_graduation) : null;

    if (gradDate && now > gradDate) {
      return <Badge variant="info">Completed</Badge>;
    }
    if (startDate && now < startDate) {
      return <Badge variant="warning">Upcoming</Badge>;
    }
    return <Badge variant="success">Active</Badge>;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Cohort Management
          </h1>
          <p className="text-muted-foreground">
            Organize students into cohorts and manage batch enrollment
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Cohort
        </Button>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search cohorts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Cohorts Grid */}
      {filteredCohorts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No cohorts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try adjusting your search" : "Create your first cohort to organize students"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Cohort
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCohorts.map((cohort) => (
            <Card key={cohort.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    {cohort.course_type && (
                      <Badge variant="outline">{cohort.course_type}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(cohort)}
                    <Dropdown
                      trigger={
                        <button className="p-1 hover:bg-muted rounded">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      }
                      align="right"
                    >
                      <DropdownItem
                        icon={<Users className="h-4 w-4" />}
                        onClick={() => window.location.href = `/admin/cohorts/${cohort.id}`}
                      >
                        View Members
                      </DropdownItem>
                      <DropdownItem
                        icon={<UserPlus className="h-4 w-4" />}
                        onClick={() => window.location.href = `/admin/cohorts/${cohort.id}/enroll`}
                      >
                        Add Students
                      </DropdownItem>
                      <DropdownItem
                        icon={<BookOpen className="h-4 w-4" />}
                        onClick={() => window.location.href = `/admin/cohorts/${cohort.id}/courses`}
                      >
                        Manage Courses
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem
                        icon={<Edit className="h-4 w-4" />}
                        onClick={() => openEditModal(cohort)}
                      >
                        Edit
                      </DropdownItem>
                      <DropdownItem
                        icon={<Trash2 className="h-4 w-4" />}
                        destructive
                        onClick={() => handleDelete(cohort)}
                      >
                        Delete
                      </DropdownItem>
                    </Dropdown>
                  </div>
                </div>

                {/* Cohort Info */}
                <Link href={`/admin/cohorts/${cohort.id}`} className="block group">
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {cohort.name}
                  </h3>
                  {cohort.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {cohort.description}
                    </p>
                  )}
                </Link>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {cohort.member_count || 0}
                      {cohort.max_students ? `/${cohort.max_students}` : ""} students
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{cohort.course_count || 0} courses</span>
                  </div>
                </div>

                {/* Dates */}
                {(cohort.start_date || cohort.expected_graduation) && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {cohort.start_date && formatDate(cohort.start_date)}
                    {cohort.start_date && cohort.expected_graduation && " - "}
                    {cohort.expected_graduation && formatDate(cohort.expected_graduation)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || !!editingCohort}
        onClose={() => {
          setShowCreateModal(false);
          setEditingCohort(null);
          resetForm();
        }}
        title={editingCohort ? "Edit Cohort" : "Create Cohort"}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Cohort Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Fall 2026 EMT Class"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course_type">Course Type</Label>
              <Select
                options={COURSE_TYPES}
                value={formData.course_type || ""}
                onChange={(v) => setFormData({ ...formData, course_type: v })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_students">Max Students</Label>
              <Input
                id="max_students"
                type="number"
                value={formData.max_students || ""}
                onChange={(e) => setFormData({ ...formData, max_students: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date || ""}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_graduation">Expected Graduation</Label>
              <Input
                id="expected_graduation"
                type="date"
                value={formData.expected_graduation || ""}
                onChange={(e) => setFormData({ ...formData, expected_graduation: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setEditingCohort(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingCohort ? handleUpdate : handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <Spinner size="sm" className="mr-2" />
              ) : null}
              {editingCohort ? "Save Changes" : "Create Cohort"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
