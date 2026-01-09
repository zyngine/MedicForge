"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { Button, Input, Label, Textarea, Select } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";
import type { ClinicalSiteForm, ClinicalSiteType, SITE_TYPE_LABELS } from "@/types";

interface SiteFormProps {
  defaultValues?: Partial<ClinicalSiteForm>;
  onSubmit: (data: ClinicalSiteForm) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const SITE_TYPES: { value: ClinicalSiteType; label: string }[] = [
  { value: "hospital", label: "Hospital" },
  { value: "ambulance_service", label: "Ambulance Service" },
  { value: "fire_department", label: "Fire Department" },
  { value: "urgent_care", label: "Urgent Care" },
  { value: "other", label: "Other" },
];

export function SiteForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: SiteFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClinicalSiteForm>({
    defaultValues: {
      name: "",
      site_type: "hospital",
      address: "",
      city: "",
      state: "",
      zip: "",
      phone: "",
      contact_name: "",
      contact_email: "",
      preceptors: [],
      notes: "",
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "preceptors",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Site Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Site Name *</Label>
            <Input
              id="name"
              {...register("name", { required: "Site name is required" })}
              placeholder="e.g., Memorial Hospital"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="site_type">Site Type *</Label>
            <Select {...register("site_type")}>
              {SITE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            {...register("address")}
            placeholder="123 Main Street"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2 col-span-2 md:col-span-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register("city")} placeholder="City" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" {...register("state")} placeholder="State" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip">ZIP Code</Label>
            <Input id="zip" {...register("zip")} placeholder="ZIP" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            {...register("phone")}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      {/* Primary Contact */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Primary Contact</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact_name">Contact Name</Label>
            <Input
              id="contact_name"
              {...register("contact_name")}
              placeholder="Contact person name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              {...register("contact_email")}
              placeholder="contact@example.com"
            />
          </div>
        </div>
      </div>

      {/* Preceptors */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Preceptors</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: "", credentials: "", phone: "" })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Preceptor
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No preceptors added yet. Click &quot;Add Preceptor&quot; to add one.
          </p>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`preceptors.${index}.name`}>Name</Label>
                    <Input
                      {...register(`preceptors.${index}.name` as const)}
                      placeholder="Preceptor name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`preceptors.${index}.credentials`}>
                      Credentials
                    </Label>
                    <Input
                      {...register(`preceptors.${index}.credentials` as const)}
                      placeholder="e.g., Paramedic, RN"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`preceptors.${index}.phone`}>Phone</Label>
                    <Input
                      {...register(`preceptors.${index}.phone` as const)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register("notes")}
          placeholder="Any additional notes about this clinical site..."
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
          {isLoading ? "Saving..." : "Save Site"}
        </Button>
      </div>
    </form>
  );
}
