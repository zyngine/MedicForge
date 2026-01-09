"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import { Label, Input, Button } from "@/components/ui";
import { Plus, Trash2, Heart, Wind, Activity, Thermometer, Brain } from "lucide-react";
import type { PatientContactFormData } from "./index";

export function VitalsStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<PatientContactFormData>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "vitals",
  });

  const addVitalSet = () => {
    append({
      time: "",
      bp_systolic: 120,
      bp_diastolic: 80,
      pulse: 80,
      respiratory_rate: 16,
      spo2: 98,
      temperature: 98.6,
      gcs: 15,
      pain_scale: 0,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Document at least one set of vital signs. Add additional sets for trending.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addVitalSet}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vitals
        </Button>
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="p-4 rounded-lg border bg-card space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Vital Set #{index + 1}</h4>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor={`vitals.${index}.time`}>Time</Label>
              <Input
                id={`vitals.${index}.time`}
                type="time"
                {...register(`vitals.${index}.time`)}
              />
            </div>

            {/* Blood Pressure */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Heart className="h-4 w-4 text-red-500" />
                BP (mmHg)
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  placeholder="SYS"
                  className="w-20"
                  {...register(`vitals.${index}.bp_systolic`, { valueAsNumber: true })}
                />
                <span>/</span>
                <Input
                  type="number"
                  placeholder="DIA"
                  className="w-20"
                  {...register(`vitals.${index}.bp_diastolic`, { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Pulse */}
            <div className="space-y-2">
              <Label htmlFor={`vitals.${index}.pulse`} className="flex items-center gap-1">
                <Activity className="h-4 w-4 text-pink-500" />
                Pulse (bpm)
              </Label>
              <Input
                id={`vitals.${index}.pulse`}
                type="number"
                {...register(`vitals.${index}.pulse`, { valueAsNumber: true })}
              />
            </div>

            {/* Respiratory Rate */}
            <div className="space-y-2">
              <Label htmlFor={`vitals.${index}.respiratory_rate`} className="flex items-center gap-1">
                <Wind className="h-4 w-4 text-blue-500" />
                RR (breaths/min)
              </Label>
              <Input
                id={`vitals.${index}.respiratory_rate`}
                type="number"
                {...register(`vitals.${index}.respiratory_rate`, { valueAsNumber: true })}
              />
            </div>

            {/* SpO2 */}
            <div className="space-y-2">
              <Label htmlFor={`vitals.${index}.spo2`}>SpO2 (%)</Label>
              <Input
                id={`vitals.${index}.spo2`}
                type="number"
                min="0"
                max="100"
                {...register(`vitals.${index}.spo2`, { valueAsNumber: true })}
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <Label htmlFor={`vitals.${index}.temperature`} className="flex items-center gap-1">
                <Thermometer className="h-4 w-4 text-orange-500" />
                Temp (°F)
              </Label>
              <Input
                id={`vitals.${index}.temperature`}
                type="number"
                step="0.1"
                {...register(`vitals.${index}.temperature`, { valueAsNumber: true })}
              />
            </div>

            {/* GCS */}
            <div className="space-y-2">
              <Label htmlFor={`vitals.${index}.gcs`} className="flex items-center gap-1">
                <Brain className="h-4 w-4 text-purple-500" />
                GCS (3-15)
              </Label>
              <Input
                id={`vitals.${index}.gcs`}
                type="number"
                min="3"
                max="15"
                {...register(`vitals.${index}.gcs`, { valueAsNumber: true })}
              />
            </div>

            {/* Pain Scale */}
            <div className="space-y-2">
              <Label htmlFor={`vitals.${index}.pain_scale`}>Pain (0-10)</Label>
              <Input
                id={`vitals.${index}.pain_scale`}
                type="number"
                min="0"
                max="10"
                {...register(`vitals.${index}.pain_scale`, { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>
      ))}

      {errors.vitals && (
        <p className="text-sm text-red-500">
          {typeof errors.vitals === "object" && "message" in errors.vitals
            ? (errors.vitals as { message?: string }).message
            : "Please complete all vital sign fields"}
        </p>
      )}

      {/* Reference Card */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <h4 className="font-semibold mb-2">Normal Vital Sign Ranges (Adult)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Blood Pressure</p>
            <p>90-140 / 60-90 mmHg</p>
          </div>
          <div>
            <p className="text-muted-foreground">Heart Rate</p>
            <p>60-100 bpm</p>
          </div>
          <div>
            <p className="text-muted-foreground">Respiratory Rate</p>
            <p>12-20 breaths/min</p>
          </div>
          <div>
            <p className="text-muted-foreground">SpO2</p>
            <p>94-100%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
