"use client";

import { useFormContext } from "react-hook-form";
import { Label, Textarea } from "@/components/ui";
import { FileText, AlertCircle } from "lucide-react";
import type { PatientContactFormData } from "./index";

const NARRATIVE_TEMPLATE = `Responded to [age] y/o [gender] with [chief complaint].

Patient presentation: [describe how patient appeared, position found, etc.]

History: [relevant medical history, medications, allergies]

Assessment findings: [physical exam findings, vital signs interpretation]

Treatment provided: [interventions performed, response to treatment]

Transport: [mode of transport, destination, patient condition during transport]`;

export function NarrativeStep() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<PatientContactFormData>();

  const narrative = watch("narrative") || "";
  const characterCount = narrative.length;
  const minCharacters = 50;

  const handleUseTemplate = () => {
    setValue("narrative", NARRATIVE_TEMPLATE);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-500" />
        <Label className="text-base font-semibold">
          Patient Care Narrative <span className="text-red-500">*</span>
        </Label>
      </div>

      <p className="text-sm text-muted-foreground">
        Write a detailed narrative describing the patient encounter from dispatch to
        disposition. This should paint a complete picture of the call and demonstrate
        your critical thinking.
      </p>

      {/* Template Button */}
      <button
        type="button"
        onClick={handleUseTemplate}
        className="text-sm text-primary hover:underline"
      >
        Use narrative template
      </button>

      {/* Narrative Textarea */}
      <div className="space-y-2">
        <Textarea
          id="narrative"
          placeholder="Responded to 65 y/o male with chest pain. Patient was found sitting upright in living room chair, diaphoretic, with obvious distress. Patient stated pain began approximately 30 minutes prior while at rest..."
          rows={12}
          className="font-mono text-sm"
          {...register("narrative")}
        />

        <div className="flex justify-between items-center">
          <p
            className={`text-sm ${
              characterCount < minCharacters ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {characterCount} characters
            {characterCount < minCharacters &&
              ` (minimum ${minCharacters} required)`}
          </p>
        </div>

        {errors.narrative && (
          <p className="text-sm text-red-500">{errors.narrative.message}</p>
        )}
      </div>

      {/* Writing Tips */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          Narrative Writing Tips
        </h4>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li>
            <strong>Be chronological:</strong> Describe events in the order they
            occurred
          </li>
          <li>
            <strong>Include pertinent negatives:</strong> Document what you ruled out,
            not just what you found
          </li>
          <li>
            <strong>Use objective language:</strong> Describe observations, not
            interpretations
          </li>
          <li>
            <strong>Document patient responses:</strong> Note how the patient responded
            to treatments
          </li>
          <li>
            <strong>Include direct quotes:</strong> When relevant, quote the patient
            directly
          </li>
          <li>
            <strong>Justify decisions:</strong> Explain why you made certain treatment
            decisions
          </li>
        </ul>
      </div>

      {/* SOAP Format Reference */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <h4 className="font-semibold mb-2 text-blue-800">SOAP Format Reference</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>
            <strong>S</strong>ubjective - What the patient tells you (chief complaint,
            history)
          </p>
          <p>
            <strong>O</strong>bjective - What you observe (vitals, physical exam
            findings)
          </p>
          <p>
            <strong>A</strong>ssessment - Your clinical impression of the problem
          </p>
          <p>
            <strong>P</strong>lan - Treatment provided and disposition
          </p>
        </div>
      </div>
    </div>
  );
}
