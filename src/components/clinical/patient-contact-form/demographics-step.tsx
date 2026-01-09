"use client";

import { useFormContext } from "react-hook-form";
import { Label, Input } from "@/components/ui";
import { PATIENT_AGE_LABELS } from "@/types";
import type { PatientContactFormData } from "./index";

const AGE_RANGES = [
  { value: "neonate", description: "0-1 month" },
  { value: "infant", description: "1 month - 1 year" },
  { value: "toddler", description: "1-3 years" },
  { value: "preschool", description: "3-5 years" },
  { value: "school_age", description: "6-12 years" },
  { value: "adolescent", description: "13-17 years" },
  { value: "adult", description: "18-64 years" },
  { value: "geriatric", description: "65+ years" },
] as const;

const GENDERS = ["Male", "Female", "Other", "Unknown"];

export function DemographicsStep() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<PatientContactFormData>();

  const selectedAgeRange = watch("patient_age_range");
  const selectedGender = watch("patient_gender");

  return (
    <div className="space-y-6">
      {/* Age Range */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Patient Age Range <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          Select the NREMT age category that best describes the patient
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {AGE_RANGES.map((age) => (
            <button
              key={age.value}
              type="button"
              onClick={() => setValue("patient_age_range", age.value)}
              className={`p-3 rounded-lg border text-left transition-colors ${
                selectedAgeRange === age.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-medium text-sm">
                {PATIENT_AGE_LABELS[age.value]}
              </p>
              <p className="text-xs text-muted-foreground">{age.description}</p>
            </button>
          ))}
        </div>
        {errors.patient_age_range && (
          <p className="text-sm text-red-500">{errors.patient_age_range.message}</p>
        )}
      </div>

      {/* Gender */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Patient Gender <span className="text-red-500">*</span>
        </Label>
        <div className="flex flex-wrap gap-3">
          {GENDERS.map((gender) => (
            <button
              key={gender}
              type="button"
              onClick={() => setValue("patient_gender", gender)}
              className={`px-6 py-2 rounded-lg border transition-colors ${
                selectedGender === gender
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {gender}
            </button>
          ))}
        </div>
        {errors.patient_gender && (
          <p className="text-sm text-red-500">{errors.patient_gender.message}</p>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-700">
          <strong>NREMT Requirement:</strong> Patient demographics help track the variety
          of patient populations you encounter during clinical rotations. NREMT requires
          documentation of patient contacts across different age groups.
        </p>
      </div>
    </div>
  );
}
