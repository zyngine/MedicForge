"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Label, Input, Button, Badge } from "@/components/ui";
import { Plus, Trash2, Pill, Stethoscope, Activity } from "lucide-react";
import { NREMT_SKILL_CATEGORIES } from "@/types";
import type { PatientContactFormData } from "./index";

const MEDICATION_ROUTES = ["PO", "SL", "IV", "IM", "IO", "IN", "Nebulizer", "Topical", "Rectal"];

const COMMON_PROCEDURES = [
  "12-Lead ECG",
  "Peripheral IV",
  "IO Access",
  "Nasal Cannula O2",
  "Non-Rebreather Mask",
  "BVM Ventilation",
  "Nebulizer Treatment",
  "Cervical Collar",
  "Long Spine Board",
  "Splinting",
  "Wound Care/Bandaging",
  "Tourniquet",
  "CPR",
  "AED/Defibrillation",
  "Blood Glucose Check",
  "ETCO2 Monitoring",
];

export function InterventionsStep() {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<PatientContactFormData>();

  const { fields: medicationFields, append: appendMedication, remove: removeMedication } = useFieldArray({
    control,
    name: "medications_given",
  });

  const skillsPerformed = watch("skills_performed") || [];
  const procedures = watch("procedures") || [];

  const toggleSkill = (skill: string) => {
    const current = skillsPerformed;
    if (current.includes(skill)) {
      setValue(
        "skills_performed",
        current.filter((s: string) => s !== skill)
      );
    } else {
      setValue("skills_performed", [...current, skill]);
    }
  };

  const toggleProcedure = (procedure: string) => {
    const current = procedures;
    if (current.includes(procedure)) {
      setValue(
        "procedures",
        current.filter((p: string) => p !== procedure)
      );
    } else {
      setValue("procedures", [...current, procedure]);
    }
  };

  const addMedication = () => {
    appendMedication({
      medication: "",
      dose: "",
      route: "",
      time: "",
    });
  };

  return (
    <div className="space-y-8">
      {/* Skills Performed */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-blue-500" />
          <Label className="text-base font-semibold">Skills Performed</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Select all skills you performed or assisted with during this patient contact
        </p>

        {NREMT_SKILL_CATEGORIES.map((category) => (
          <div key={category.category} className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {category.category}
            </p>
            <div className="flex flex-wrap gap-2">
              {category.skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    skillsPerformed.includes(skill)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        ))}

        {skillsPerformed.length > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium mb-2">
              Selected Skills ({skillsPerformed.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {skillsPerformed.map((skill: string) => (
                <Badge key={skill} variant="default">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Medications Given */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-green-500" />
            <Label className="text-base font-semibold">Medications Administered</Label>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addMedication}>
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </div>

        {medicationFields.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No medications documented. Click "Add Medication" if medications were administered.
          </p>
        ) : (
          <div className="space-y-3">
            {medicationFields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 rounded-lg border bg-card grid grid-cols-2 md:grid-cols-5 gap-3 items-end"
              >
                <div className="space-y-2">
                  <Label htmlFor={`medications_given.${index}.medication`}>Medication</Label>
                  <Input
                    id={`medications_given.${index}.medication`}
                    placeholder="e.g., Aspirin"
                    {...register(`medications_given.${index}.medication`)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`medications_given.${index}.dose`}>Dose</Label>
                  <Input
                    id={`medications_given.${index}.dose`}
                    placeholder="e.g., 324mg"
                    {...register(`medications_given.${index}.dose`)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`medications_given.${index}.route`}>Route</Label>
                  <select
                    id={`medications_given.${index}.route`}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...register(`medications_given.${index}.route`)}
                  >
                    <option value="">Select...</option>
                    {MEDICATION_ROUTES.map((route) => (
                      <option key={route} value={route}>
                        {route}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`medications_given.${index}.time`}>Time</Label>
                  <Input
                    id={`medications_given.${index}.time`}
                    type="time"
                    {...register(`medications_given.${index}.time`)}
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMedication(index)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Procedures */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-500" />
          <Label className="text-base font-semibold">Procedures Performed</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Select all procedures performed during patient care
        </p>

        <div className="flex flex-wrap gap-2">
          {COMMON_PROCEDURES.map((procedure) => (
            <button
              key={procedure}
              type="button"
              onClick={() => toggleProcedure(procedure)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                procedures.includes(procedure)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {procedure}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
