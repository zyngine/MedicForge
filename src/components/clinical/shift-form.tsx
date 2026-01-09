"use client";

import { useForm } from "react-hook-form";
import { Button, Input, Label, Textarea, Select } from "@/components/ui";
import type { ClinicalShiftForm, ClinicalSite, Course } from "@/types";

interface ShiftFormProps {
  sites: ClinicalSite[];
  courses?: Course[];
  defaultValues?: Partial<ClinicalShiftForm>;
  onSubmit: (data: ClinicalShiftForm) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ShiftForm({
  sites,
  courses = [],
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: ShiftFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClinicalShiftForm>({
    defaultValues: {
      site_id: "",
      course_id: "",
      title: "",
      shift_date: "",
      start_time: "07:00",
      end_time: "19:00",
      capacity: 1,
      notes: "",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Site Selection */}
      <div className="space-y-2">
        <Label htmlFor="site_id">Clinical Site *</Label>
        <Select
          {...register("site_id", { required: "Please select a clinical site" })}
        >
          <option value="">Select a site...</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </Select>
        {errors.site_id && (
          <p className="text-sm text-red-500">{errors.site_id.message}</p>
        )}
      </div>

      {/* Course Selection (Optional) */}
      {courses.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="course_id">Limit to Course (Optional)</Label>
          <Select {...register("course_id")}>
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Leave empty to make this shift available to all students
          </p>
        </div>
      )}

      {/* Shift Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Shift Title *</Label>
        <Input
          id="title"
          {...register("title", { required: "Shift title is required" })}
          placeholder="e.g., 12-Hour Day Shift, Night Shift"
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="shift_date">Date *</Label>
          <Input
            id="shift_date"
            type="date"
            {...register("shift_date", { required: "Date is required" })}
          />
          {errors.shift_date && (
            <p className="text-sm text-red-500">{errors.shift_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time *</Label>
          <Input
            id="start_time"
            type="time"
            {...register("start_time", { required: "Start time is required" })}
          />
          {errors.start_time && (
            <p className="text-sm text-red-500">{errors.start_time.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">End Time *</Label>
          <Input
            id="end_time"
            type="time"
            {...register("end_time", { required: "End time is required" })}
          />
          {errors.end_time && (
            <p className="text-sm text-red-500">{errors.end_time.message}</p>
          )}
        </div>
      </div>

      {/* Capacity */}
      <div className="space-y-2">
        <Label htmlFor="capacity">Student Capacity *</Label>
        <Input
          id="capacity"
          type="number"
          min={1}
          max={50}
          {...register("capacity", {
            required: "Capacity is required",
            min: { value: 1, message: "Capacity must be at least 1" },
            max: { value: 50, message: "Capacity cannot exceed 50" },
            valueAsNumber: true,
          })}
        />
        <p className="text-xs text-muted-foreground">
          Maximum number of students who can book this shift
        </p>
        {errors.capacity && (
          <p className="text-sm text-red-500">{errors.capacity.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          placeholder="Any special instructions or requirements for this shift..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Shift"}
        </Button>
      </div>
    </form>
  );
}
