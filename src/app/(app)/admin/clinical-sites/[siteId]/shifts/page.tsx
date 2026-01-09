"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Card, CardContent, Badge, Spinner, Modal } from "@/components/ui";
import { ShiftForm, ShiftCard } from "@/components/clinical";
import {
  Plus,
  ArrowLeft,
  Calendar,
  Building2,
  Clock,
  Users,
  AlertCircle,
} from "lucide-react";
import type {
  ClinicalSite,
  ClinicalShift,
  ClinicalShiftWithDetails,
  ClinicalShiftForm,
  Course,
} from "@/types";
import { format, parseISO, addDays } from "date-fns";

// Mock data for demonstration
const mockSite: ClinicalSite = {
  id: "1",
  tenant_id: "t1",
  name: "Memorial Hospital",
  site_type: "hospital",
  address: "123 Medical Center Dr",
  city: "Springfield",
  state: "IL",
  zip: "62701",
  phone: "(555) 123-4567",
  contact_name: "Dr. Sarah Johnson",
  contact_email: "sjohnson@memorial.org",
  preceptors: [
    { name: "Mike Thompson", credentials: "Paramedic", phone: "(555) 111-2222" },
  ],
  notes: "Main ED entrance - check in at EMS desk",
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCourses: Course[] = [
  {
    id: "c1",
    tenant_id: "t1",
    title: "EMT Initial",
    description: "EMT certification course",
    course_code: "EMT101",
    course_type: "EMT",
    instructor_id: "i1",
    enrollment_code: "EMT2024",
    start_date: null,
    end_date: null,
    max_students: 25,
    settings: {},
    is_active: true,
    is_archived: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "c2",
    tenant_id: "t1",
    title: "Paramedic Program",
    description: "Paramedic certification course",
    course_code: "PARA201",
    course_type: "Paramedic",
    instructor_id: "i1",
    enrollment_code: "PARA2024",
    start_date: null,
    end_date: null,
    max_students: 20,
    settings: {},
    is_active: true,
    is_archived: false,
    created_at: new Date().toISOString(),
  },
];

const generateMockShifts = (siteId: string): ClinicalShiftWithDetails[] => {
  const today = new Date();
  return [
    {
      id: "s1",
      tenant_id: "t1",
      site_id: siteId,
      course_id: null,
      title: "Day Shift - 12 Hours",
      shift_date: format(addDays(today, 2), "yyyy-MM-dd"),
      start_time: "07:00",
      end_time: "19:00",
      capacity: 2,
      notes: "Report to EMS station at 0645",
      created_by: "admin1",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      site: mockSite,
      bookings_count: 1,
      available_slots: 1,
      is_available: true,
    },
    {
      id: "s2",
      tenant_id: "t1",
      site_id: siteId,
      course_id: null,
      title: "Night Shift - 12 Hours",
      shift_date: format(addDays(today, 2), "yyyy-MM-dd"),
      start_time: "19:00",
      end_time: "07:00",
      capacity: 1,
      notes: null,
      created_by: "admin1",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      site: mockSite,
      bookings_count: 1,
      available_slots: 0,
      is_available: false,
    },
    {
      id: "s3",
      tenant_id: "t1",
      site_id: siteId,
      course_id: "c2",
      title: "Paramedic Clinical Rotation",
      shift_date: format(addDays(today, 5), "yyyy-MM-dd"),
      start_time: "08:00",
      end_time: "16:00",
      capacity: 3,
      notes: "ALS skills practice focus",
      created_by: "admin1",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      site: mockSite,
      course: mockCourses[1],
      bookings_count: 0,
      available_slots: 3,
      is_available: true,
    },
  ];
};

export default function SiteShiftsPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [site] = useState<ClinicalSite>(mockSite);
  const [shifts, setShifts] = useState<ClinicalShiftWithDetails[]>(
    generateMockShifts(siteId)
  );
  const [courses] = useState<Course[]>(mockCourses);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ClinicalShiftWithDetails | null>(
    null
  );
  const [deletingShift, setDeletingShift] = useState<ClinicalShiftWithDetails | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddShift = async (data: ClinicalShiftForm) => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      const newShift: ClinicalShiftWithDetails = {
        id: Date.now().toString(),
        tenant_id: "t1",
        ...data,
        course_id: data.course_id || null,
        notes: data.notes || null,
        created_by: "admin1",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        site: site,
        course: data.course_id
          ? courses.find((c) => c.id === data.course_id)
          : undefined,
        bookings_count: 0,
        available_slots: data.capacity,
        is_available: true,
      };
      setShifts([...shifts, newShift]);
      setShowAddModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditShift = async (data: ClinicalShiftForm) => {
    if (!editingShift) return;
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      const updatedShifts = shifts.map((shift) =>
        shift.id === editingShift.id
          ? {
              ...shift,
              ...data,
              course_id: data.course_id || null,
              notes: data.notes || null,
              course: data.course_id
                ? courses.find((c) => c.id === data.course_id)
                : undefined,
              available_slots: data.capacity - (shift.bookings_count || 0),
              is_available:
                data.capacity - (shift.bookings_count || 0) > 0,
              updated_at: new Date().toISOString(),
            }
          : shift
      );
      setShifts(updatedShifts);
      setEditingShift(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!deletingShift) return;
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      setShifts(shifts.filter((shift) => shift.id !== deletingShift.id));
      setDeletingShift(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
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
              <span>
                {[site.city, site.state].filter(Boolean).join(", ")}
              </span>
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
                This will cancel all existing bookings for this shift. Students
                will be notified of the cancellation.
              </p>
              {deletingShift && (deletingShift.bookings_count ?? 0) > 0 && (
                <p className="text-sm text-red-600 mt-2">
                  Warning: This shift has {deletingShift.bookings_count} active
                  booking{(deletingShift.bookings_count ?? 0) !== 1 ? "s" : ""}.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingShift(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteShift}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete Shift"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
