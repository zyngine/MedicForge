"use client";

import { useFormContext } from "react-hook-form";
import { Label, Input, Textarea } from "@/components/ui";
import type { PatientContactFormData } from "./index";

const CALL_TYPES = ["911", "IFT", "Standby", "Other"];
const CALL_NATURES = ["Emergency", "Non-Emergency", "Scheduled"];

export function CallInfoStep() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<PatientContactFormData>();

  const selectedCallType = watch("call_type");
  const selectedCallNature = watch("call_nature");

  return (
    <div className="space-y-6">
      {/* Call Type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Call Type <span className="text-red-500">*</span>
        </Label>
        <div className="flex flex-wrap gap-3">
          {CALL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setValue("call_type", type)}
              className={`px-6 py-2 rounded-lg border transition-colors ${
                selectedCallType === type
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        {errors.call_type && (
          <p className="text-sm text-red-500">{errors.call_type.message}</p>
        )}
      </div>

      {/* Call Nature */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Call Nature <span className="text-red-500">*</span>
        </Label>
        <div className="flex flex-wrap gap-3">
          {CALL_NATURES.map((nature) => (
            <button
              key={nature}
              type="button"
              onClick={() => setValue("call_nature", nature)}
              className={`px-6 py-2 rounded-lg border transition-colors ${
                selectedCallNature === nature
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {nature}
            </button>
          ))}
        </div>
        {errors.call_nature && (
          <p className="text-sm text-red-500">{errors.call_nature.message}</p>
        )}
      </div>

      {/* Dispatch Complaint */}
      <div className="space-y-2">
        <Label htmlFor="dispatch_complaint" className="text-base font-semibold">
          Dispatch Complaint <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          What was the call dispatched as?
        </p>
        <Input
          id="dispatch_complaint"
          placeholder="e.g., Chest Pain, Difficulty Breathing, MVA"
          {...register("dispatch_complaint")}
        />
        {errors.dispatch_complaint && (
          <p className="text-sm text-red-500">{errors.dispatch_complaint.message}</p>
        )}
      </div>

      {/* Chief Complaint */}
      <div className="space-y-2">
        <Label htmlFor="chief_complaint" className="text-base font-semibold">
          Chief Complaint <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          Patient's stated reason for calling or primary complaint
        </p>
        <Textarea
          id="chief_complaint"
          placeholder="e.g., 65 y/o male c/o chest pain radiating to left arm x 30 minutes"
          rows={3}
          {...register("chief_complaint")}
        />
        {errors.chief_complaint && (
          <p className="text-sm text-red-500">{errors.chief_complaint.message}</p>
        )}
      </div>
    </div>
  );
}
