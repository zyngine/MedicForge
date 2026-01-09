"use client";

import { useFormContext } from "react-hook-form";
import { Label, Input, Textarea } from "@/components/ui";
import { Truck, MapPin, User } from "lucide-react";
import type { PatientContactFormData } from "./index";

const DISPOSITIONS = [
  "Transported - Emergency",
  "Transported - Non-Emergency",
  "Transported - AMA",
  "Refused Transport",
  "No Patient Found",
  "Cancelled",
  "Standby - No Patient",
  "Dead on Scene",
  "Other",
];

const TRANSPORT_MODES = ["ALS", "BLS", "Ground", "Air", "Private Vehicle"];

export function DispositionStep() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<PatientContactFormData>();

  const selectedDisposition = watch("disposition");
  const selectedTransportMode = watch("transport_mode");
  const wasTeamLead = watch("was_team_lead");

  const showTransportFields =
    selectedDisposition?.toLowerCase().includes("transported");

  return (
    <div className="space-y-6">
      {/* Disposition */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-500" />
          <Label className="text-base font-semibold">
            Disposition <span className="text-red-500">*</span>
          </Label>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {DISPOSITIONS.map((disposition) => (
            <button
              key={disposition}
              type="button"
              onClick={() => setValue("disposition", disposition)}
              className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                selectedDisposition === disposition
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {disposition}
            </button>
          ))}
        </div>
        {errors.disposition && (
          <p className="text-sm text-red-500">{errors.disposition.message}</p>
        )}
      </div>

      {/* Transport Details (conditional) */}
      {showTransportFields && (
        <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
          <h4 className="font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Transport Details
          </h4>

          <div className="space-y-2">
            <Label htmlFor="transport_destination">
              Transport Destination <span className="text-red-500">*</span>
            </Label>
            <Input
              id="transport_destination"
              placeholder="e.g., Memorial Hospital, County General ER"
              {...register("transport_destination")}
            />
            {errors.transport_destination && (
              <p className="text-sm text-red-500">
                {errors.transport_destination.message}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Transport Mode</Label>
            <div className="flex flex-wrap gap-3">
              {TRANSPORT_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setValue("transport_mode", mode)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedTransportMode === mode
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Student Role */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-purple-500" />
          <Label className="text-base font-semibold">Your Role</Label>
        </div>

        <div className="space-y-3">
          <Label>Were you the Team Lead?</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setValue("was_team_lead", true)}
              className={`px-6 py-3 rounded-lg border transition-colors flex-1 ${
                wasTeamLead === true
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-medium">Yes - Team Lead</p>
              <p className="text-sm opacity-80">
                I was responsible for patient assessment and care decisions
              </p>
            </button>
            <button
              type="button"
              onClick={() => setValue("was_team_lead", false)}
              className={`px-6 py-3 rounded-lg border transition-colors flex-1 ${
                wasTeamLead === false
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="font-medium">No - Team Member</p>
              <p className="text-sm opacity-80">
                I assisted with patient care under direction
              </p>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role_description">
            Role Description <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Describe what you did during this patient encounter
          </p>
          <Textarea
            id="role_description"
            placeholder="e.g., Performed primary assessment, obtained vital signs, established IV access, administered medications per protocol..."
            rows={3}
            {...register("role_description")}
          />
          {errors.role_description && (
            <p className="text-sm text-red-500">{errors.role_description.message}</p>
          )}
        </div>
      </div>

      {/* NREMT Note */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-700">
          <strong>NREMT Requirement:</strong> Team lead experiences are particularly
          valuable for demonstrating competency. Document your role accurately to
          show the variety of your clinical experiences.
        </p>
      </div>
    </div>
  );
}
