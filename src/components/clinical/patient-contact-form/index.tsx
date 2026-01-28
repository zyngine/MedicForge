"use client";

import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ChevronLeft, ChevronRight, Check, AlertCircle } from "lucide-react";
import { DemographicsStep } from "./demographics-step";
import { CallInfoStep } from "./call-info-step";
import { AssessmentStep } from "./assessment-step";
import { VitalsStep } from "./vitals-step";
import { InterventionsStep } from "./interventions-step";
import { DispositionStep } from "./disposition-step";
import { NarrativeStep } from "./narrative-step";
import type { PatientContactForm } from "@/types";

const vitalSchema = z.object({
  time: z.string().min(1, "Time is required"),
  bp_systolic: z.number().min(0).max(300),
  bp_diastolic: z.number().min(0).max(200),
  pulse: z.number().min(0).max(300),
  respiratory_rate: z.number().min(0).max(60),
  spo2: z.number().min(0).max(100),
  temperature: z.number().min(90).max(110).optional(),
  gcs: z.number().min(3).max(15),
  pain_scale: z.number().min(0).max(10),
});

const medicationSchema = z.object({
  medication: z.string().min(1, "Medication name is required"),
  dose: z.string().min(1, "Dose is required"),
  route: z.string().min(1, "Route is required"),
  time: z.string().min(1, "Time is required"),
});

const patientContactFormSchema = z.object({
  // Demographics
  patient_age_range: z.enum([
    "neonate",
    "infant",
    "toddler",
    "preschool",
    "school_age",
    "adolescent",
    "adult",
    "geriatric",
  ]),
  patient_gender: z.string().min(1, "Gender is required"),

  // Call Info
  call_type: z.string().min(1, "Call type is required"),
  call_nature: z.string().min(1, "Call nature is required"),
  dispatch_complaint: z.string().min(1, "Dispatch complaint is required"),
  chief_complaint: z.string().min(1, "Chief complaint is required"),

  // Assessment
  primary_impression: z.string().min(1, "Primary impression is required"),
  secondary_impression: z.string().optional(),
  level_of_consciousness: z.string().min(1, "LOC is required"),
  mental_status: z.string().min(1, "Mental status is required"),

  // Vitals
  vitals: z.array(vitalSchema).min(1, "At least one set of vitals is required"),

  // Interventions
  skills_performed: z.array(z.string()),
  medications_given: z.array(medicationSchema),
  procedures: z.array(z.string()),

  // Disposition
  disposition: z.string().min(1, "Disposition is required"),
  transport_destination: z.string().optional(),
  transport_mode: z.string().optional(),

  // Role
  was_team_lead: z.boolean(),
  role_description: z.string().min(1, "Role description is required"),

  // Narrative
  narrative: z.string().min(50, "Narrative must be at least 50 characters"),
});

export type PatientContactFormData = z.infer<typeof patientContactFormSchema>;

const STEPS = [
  { id: "demographics", title: "Patient Demographics", component: DemographicsStep },
  { id: "call-info", title: "Call Information", component: CallInfoStep },
  { id: "assessment", title: "Assessment", component: AssessmentStep },
  { id: "vitals", title: "Vital Signs", component: VitalsStep },
  { id: "interventions", title: "Interventions", component: InterventionsStep },
  { id: "disposition", title: "Disposition", component: DispositionStep },
  { id: "narrative", title: "Narrative", component: NarrativeStep },
];

interface PatientContactFormProps {
  bookingId: string | null;
  onSubmit: (data: PatientContactFormData) => Promise<void>;
  onCancel: () => void;
}

export function PatientContactFormWizard({
  bookingId,
  onSubmit,
  onCancel,
}: PatientContactFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useForm<PatientContactFormData>({
    resolver: zodResolver(patientContactFormSchema),
    defaultValues: {
      patient_age_range: "adult",
      patient_gender: "",
      call_type: "",
      call_nature: "",
      dispatch_complaint: "",
      chief_complaint: "",
      primary_impression: "",
      secondary_impression: "",
      level_of_consciousness: "Alert",
      mental_status: "",
      vitals: [
        {
          time: "",
          bp_systolic: 120,
          bp_diastolic: 80,
          pulse: 80,
          respiratory_rate: 16,
          spo2: 98,
          temperature: 98.6,
          gcs: 15,
          pain_scale: 0,
        },
      ],
      skills_performed: [],
      medications_given: [],
      procedures: [],
      disposition: "",
      transport_destination: "",
      transport_mode: "",
      was_team_lead: false,
      role_description: "",
      narrative: "",
    },
    mode: "onChange",
  });

  const { trigger, handleSubmit } = methods;

  const getFieldsForStep = (step: number): (keyof PatientContactFormData)[] => {
    switch (step) {
      case 0:
        return ["patient_age_range", "patient_gender"];
      case 1:
        return ["call_type", "call_nature", "dispatch_complaint", "chief_complaint"];
      case 2:
        return [
          "primary_impression",
          "secondary_impression",
          "level_of_consciousness",
          "mental_status",
        ];
      case 3:
        return ["vitals"];
      case 4:
        return ["skills_performed", "medications_given", "procedures"];
      case 5:
        return ["disposition", "transport_destination", "transport_mode", "was_team_lead", "role_description"];
      case 6:
        return ["narrative"];
      default:
        return [];
    }
  };

  const handleNext = async () => {
    const fields = getFieldsForStep(currentStep);
    const isValid = await trigger(fields);

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleFormSubmit = async (data: PatientContactFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const CurrentStepComponent = STEPS[currentStep].component;
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => index < currentStep && setCurrentStep(index)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    index < currentStep
                      ? "bg-primary text-primary-foreground cursor-pointer"
                      : index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  disabled={index > currentStep}
                >
                  {index < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      index < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm font-medium">{STEPS[currentStep].title}</p>
            <p className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep].title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CurrentStepComponent />
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 0 ? onCancel : handlePrevious}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {currentStep === 0 ? "Cancel" : "Previous"}
          </Button>

          {isLastStep ? (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Patient Contact"}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}

export { DemographicsStep } from "./demographics-step";
export { CallInfoStep } from "./call-info-step";
export { AssessmentStep } from "./assessment-step";
export { VitalsStep } from "./vitals-step";
export { InterventionsStep } from "./interventions-step";
export { DispositionStep } from "./disposition-step";
export { NarrativeStep } from "./narrative-step";
