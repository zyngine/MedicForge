"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Card, CardContent, Badge, Spinner, Modal, Alert } from "@/components/ui";
import { ShiftForm, ShiftCard } from "@/components/clinical";
import { Plus, ArrowLeft, Calendar, Building2, AlertCircle } from "lucide-react";
import { useClinicalSite } from "@/lib/hooks/use-clinical-sites";
import { useClinicalShifts } from "@/lib/hooks/use-clinical-shifts";
import { useCourses } from "@/lib/hooks/use-courses";
import type { ClinicalShiftWithDetails, ClinicalShiftForm } from "@/types";

export default function SiteShiftsPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const { site, isLoading: siteLoading, error: siteError } = useClinicalSite(siteId);
  const { shifts, isLoading: shiftsLoading, error: shiftsError, createShift, updateShift, deleteShift } = useClinicalShifts({ siteId });
  const { data: courses = [] } = useCourses();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ClinicalShiftWithDetails | null>(null);
  const [deletingShift, setDeletingShift] = useState<ClinicalShiftWithDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddShift = async (data: ClinicalShiftForm) => {
    setIsSubmitting(true);
    try {
      const result = await createShift(data);
      if (result) {
        setShowAddModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditShift = async (data: ClinicalShiftForm) => {
    if (!editingShift) return;
    setIsSubmitting(true);
    try {
      const result = await updateShift(editingShift.id, data);
      if (result) {
        setEditingShift(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!deletingShift) return;
    setIsSubmitting(true);
    try {
      const success = await deleteShift(deletingShift.id);
      if (success) {
        setDeletingShift(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (siteLoading || shiftsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (siteError || shiftsError) {
    return (
      <Alert variant="error" title="Error loading data">
        {siteError?.message || shiftsError?.message}
      </Alert>
    );
  }

  if (!site) {
    return (
      <Alert variant="error" title="Site not found">
        The clinical site could not be found.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/clinical-sites"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clinical Sites
          </Link>
          <h1 className="text-2xl font-bold">{site.name}</h1>
          <div className="flex items-center gap-4 text-muted-foreground mt-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{[site.city, site.state].filter(Boolean).join(", ")}</span>
            </div>
            <Badge variant="secondary">
              {shifts.length} shift{shifts.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Shift
        </Button>
      </div>

      {/* Shifts List */}
      {shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Shifts Scheduled</h3>
              <p className="text-muted-foreground mb-4">
                Create shifts for students to book at this clinical site.
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Shift
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onEdit={() => setEditingShift(shift)}
              onDelete={() => setDeletingShift(shift)}
              showBookButton={false}
            />
          ))}
        </div>
      )}

      {/* Add Shift Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Clinical Shift"
        size="lg"
      >
        <ShiftForm
          sites={[site]}
          courses={courses}
          defaultValues={{ site_id: siteId }}
          onSubmit={handleAddShift}
          onCancel={() => setShowAddModal(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Edit Shift Modal */}
      <Modal
        isOpen={!!editingShift}
        onClose={() => setEditingShift(null)}
        title="Edit Clinical Shift"
        size="lg"
      >
        {editingShift && (
          <ShiftForm
            sites={[site]}
            courses={courses}
            defaultValues={{
              site_id: editingShift.site_id,
              course_id: editingShift.course_id || "",
              title: editingShift.title,
              shift_date: editingShift.shift_date,
              start_time: editingShift.start_time,
              end_time: editingShift.end_time,
              capacity: editingShift.capacity,
              notes: editingShift.notes || "",
            }}
            onSubmit={handleEditShift}
            onCancel={() => setEditingShift(null)}
            isLoading={isSubmitting}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingShift}
        onClose={() => setDeletingShift(null)}
        title="Delete Shift"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">
                Are you sure you want to delete this shift?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                This will cancel all existing bookings for this shift.
              </p>
              {deletingShift && (deletingShift.bookings_count ?? 0) > 0 && (
                <p className="text-sm text-red-600 mt-2">
                  Warning: This shift has {deletingShift.bookings_count} active booking{(deletingShift.bookings_count ?? 0) !== 1 ? "s" : ""}.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeletingShift(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteShift} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete Shift"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
