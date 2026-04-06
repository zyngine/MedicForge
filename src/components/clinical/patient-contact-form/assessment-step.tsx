"use client";

import { useFormContext } from "react-hook-form";
import { Label, Input } from "@/components/ui";
import type { PatientContactFormData } from "./index";

const LOC_OPTIONS = ["Alert", "Verbal", "Painful", "Unresponsive"];

const COMMON_IMPRESSIONS = [
  "Acute Coronary Syndrome",
  "Stroke/CVA",
  "Respiratory Distress",
  "COPD Exacerbation",
  "Asthma",
  "Allergic Reaction/Anaphylaxis",
  "Diabetic Emergency",
  "Seizure",
  "Syncope",
  "Abdominal Pain",
  "Trauma - Blunt",
  "Trauma - Penetrating",
  "Fracture",
  "Laceration",
  "Burns",
  "Overdose/Poisoning",
  "Behavioral/Psychiatric",
  "Cardiac Arrest",
  "Other",
];

export function AssessmentStep() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<PatientContactFormData>();

  const selectedLOC = watch("level_of_consciousness");
  const primaryImpression = watch("primary_impression");

  return (
    <div className="space-y-6">
      {/* Level of Consciousness */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Level of Consciousness (AVPU) <span className="text-red-500">*</span>
        </Label>
        <div className="flex flex-wrap gap-3">
          {LOC_OPTIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setValue("level_of_consciousness", loc)}
              className={`px-6 py-2 rounded-lg border transition-colors ${
                selectedLOC === loc
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="font-bold">{loc[0]}</span>
              <span className="text-muted-foreground ml-1">- {loc}</span>
            </button>
          ))}
        </div>
        {errors.level_of_consciousness && (
          <p className="text-sm text-red-500">{errors.level_of_consciousness.message}</p>
        )}
      </div>

      {/* Mental Status */}
      <div className="space-y-2">
        <Label htmlFor="mental_status" className="text-base font-semibold">
          Mental Status <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          Describe patient orientation and mental status
        </p>
        <Input
          id="mental_status"
          placeholder="e.g., Oriented x4, Confused, GCS 14"
          {...register("mental_status")}
        />
        {errors.mental_status && (
          <p className="text-sm text-red-500">{errors.mental_status.message}</p>
        )}
      </div>

      {/* Primary Impression */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Primary Impression <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          What do you believe is the primary problem?
        </p>

        {/* Quick Select */}
        <div className="flex flex-wrap gap-2 mb-3">
          {COMMON_IMPRESSIONS.slice(0, 8).map((impression) => (
            <button
              key={impression}
              type="button"
              onClick={() => setValue("primary_impression", impression)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                primaryImpression === impression
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {impression}
            </button>
          ))}
        </div>

        <Input
          id="primary_impression"
          placeholder="Type or select from common impressions above"
          {...register("primary_impression")}
        />
        {errors.primary_impression && (
          <p className="text-sm text-red-500">{errors.primary_impression.message}</p>
        )}
      </div>

      {/* Secondary Impression */}
      <div className="space-y-2">
        <Label htmlFor="secondary_impression" className="text-base font-semibold">
          Secondary Impression
        </Label>
        <p className="text-sm text-muted-foreground">
          Any additional conditions or contributing factors (optional)
        </p>
        <Input
          id="secondary_impression"
          placeholder="e.g., Hypertension, Diabetes"
          {...register("secondary_impression")}
        />
      </div>
    </div>
  );
}
