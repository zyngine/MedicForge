"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Progress,
  Input,
  Label,
  Textarea,
  Select,
  Modal,
  Spinner,
  Alert,
} from "@/components/ui";
import {
  Activity,
  ArrowLeft,
  Plus,
  Trash2,
  Heart,
  Wind,
  Thermometer,
  Brain,
  Droplet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  useMyVitalSigns,
  useVitalsProgress,
  useCreateVitalSign,
  useDeleteVitalSign,
  formatVitalsSummary,
  getContextLabel,
  VITALS_CONTEXTS,
  VITALS_SUBJECT_TYPES,
  BP_METHODS,
  type VitalSignInput,
} from "@/lib/hooks/use-vital-signs";
import { useMyEnrollments } from "@/lib/hooks/use-enrollments";
import { formatDate, localDateString, localTimeString } from "@/lib/utils";

const AGE_RANGES = [
  { value: "newborn", label: "Newborn" },
  { value: "infant", label: "Infant" },
  { value: "child", label: "Child" },
  { value: "adolescent", label: "Adolescent" },
  { value: "adult", label: "Adult" },
  { value: "geriatric", label: "Geriatric" },
];

/** Blank form. Unlike the patient-contact wizard this does not pre-fill normal
 *  values — a prefilled 120/80 is a number nobody measured, and these are being
 *  counted towards a requirement. */
const emptyForm = {
  date: "",
  time: "",
  context: "lab",
  course_id: "",
  setting: "",
  subject_type: "classmate",
  subject_age_range: "adult",
  bp_systolic: "",
  bp_diastolic: "",
  bp_method: "auscultated",
  pulse: "",
  pulse_quality: "",
  respiratory_rate: "",
  spo2: "",
  temperature: "",
  blood_glucose: "",
  gcs: "",
  pain_scale: "",
  skin: "",
  pupils: "",
  notes: "",
};

/** "" -> null, otherwise a number. Keeps an untouched field out of the row
 *  rather than storing a zero somebody never measured. */
function num(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function StudentVitalsPage() {
  const { data: entries = [], isLoading, error, refetch } = useMyVitalSigns();
  const { data: progress } = useVitalsProgress();
  const { data: enrollments = [] } = useMyEnrollments();
  const createVital = useCreateVitalSign();
  const deleteVital = useDeleteVitalSign();

  const [showModal, setShowModal] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [formError, setFormError] = React.useState<string | null>(null);

  const openModal = () => {
    // Default to now, in the student's own local terms.
    setForm({ ...emptyForm, date: localDateString(), time: localTimeString().slice(0, 5) });
    setFormError(null);
    setShowModal(true);
  };

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    const measurements = [
      form.bp_systolic,
      form.bp_diastolic,
      form.pulse,
      form.respiratory_rate,
      form.spo2,
      form.temperature,
      form.blood_glucose,
      form.gcs,
    ];

    // Mirrors the table's own CHECK constraint, so the student gets a sentence
    // rather than a Postgres constraint name.
    if (measurements.every((m) => m.trim() === "")) {
      setFormError("Record at least one measurement — an empty set does not count.");
      return;
    }

    if (!form.date) {
      setFormError("Enter the date this set was taken.");
      return;
    }

    const recordedAt = new Date(`${form.date}T${form.time || "00:00"}`);
    if (Number.isNaN(recordedAt.getTime())) {
      setFormError("That date and time could not be read.");
      return;
    }

    const payload: VitalSignInput = {
      recorded_at: recordedAt.toISOString(),
      context: form.context,
      course_id: form.course_id || null,
      setting: form.setting || null,
      subject_type: form.subject_type || null,
      subject_age_range: form.subject_age_range || null,
      bp_systolic: num(form.bp_systolic),
      bp_diastolic: num(form.bp_diastolic),
      bp_method: form.bp_method || null,
      pulse: num(form.pulse),
      pulse_quality: form.pulse_quality || null,
      respiratory_rate: num(form.respiratory_rate),
      spo2: num(form.spo2),
      temperature: num(form.temperature),
      blood_glucose: num(form.blood_glucose),
      gcs: num(form.gcs),
      pain_scale: num(form.pain_scale),
      skin: form.skin || null,
      pupils: form.pupils || null,
      notes: form.notes || null,
    };

    try {
      await createVital.mutateAsync(payload);
      setShowModal(false);
      setForm(emptyForm);
      setFormError(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save this set");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this set of vitals? It will no longer count towards your total.")) return;
    try {
      await deleteVital.mutateAsync(id);
    } catch (err) {
      console.error("Failed to delete vitals:", err);
    }
  };

  const total = progress?.logged_total ?? 0;
  const required = progress?.required_total ?? null;
  const remaining = progress?.remaining ?? null;
  const pct = required && required > 0 ? Math.min((total / required) * 100, 100) : 0;
  const isComplete = required != null && total >= required;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
          <h3 className="text-lg font-medium mb-2">Could not load your vitals log</h3>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/student/clinical">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Clinical Tracker
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Vital Signs Log</h1>
          <p className="text-muted-foreground">
            Every set you document counts, whether you log it here or on a patient contact.
          </p>
        </div>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4 mr-2" />
          Log Vital Signs
        </Button>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={
                isComplete
                  ? "p-3 rounded-lg bg-success/10 text-success"
                  : "p-3 rounded-lg bg-primary/10 text-primary"
              }
            >
              {isComplete ? <CheckCircle className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vital sign sets documented</p>
              <p className="text-2xl font-bold">
                {total}
                {required != null && <span className="text-muted-foreground">/{required}</span>}
              </p>
            </div>
          </div>

          {required != null ? (
            <>
              <Progress value={pct} size="md" variant={isComplete ? "success" : "default"} />
              <p className="text-xs text-muted-foreground mt-2">
                {isComplete
                  ? "Requirement met."
                  : `${remaining} more to go.`}{" "}
                {progress?.logged_standalone ?? 0} logged here,{" "}
                {progress?.logged_in_patient_contacts ?? 0} from patient contacts.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {progress?.logged_standalone ?? 0} logged here,{" "}
              {progress?.logged_in_patient_contacts ?? 0} from patient contacts. Your program
              has not set a target.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Log */}
      <Card>
        <CardHeader>
          <CardTitle>Your log</CardTitle>
          <CardDescription>
            Sets documented on a patient contact report are counted in the total above but
            are edited on that report.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nothing logged yet</h3>
              <p className="text-muted-foreground mb-4">
                Record a set from lab, a rotation, or a ride-along.
              </p>
              <Button onClick={openModal}>
                <Plus className="h-4 w-4 mr-2" />
                Log Your First Set
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium">When</th>
                    <th className="text-left py-3 px-4 font-medium">Where</th>
                    <th className="text-left py-3 px-4 font-medium">Values</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDate(entry.recorded_at)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {getContextLabel(entry.context)}
                        </Badge>
                        {entry.setting && (
                          <span className="text-sm text-muted-foreground ml-2">
                            {entry.setting}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">{formatVitalsSummary(entry)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleteVital.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Log Vital Signs"
        size="lg"
      >
        <div className="space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Setting</Label>
              <Select
                value={form.context}
                onChange={(v) => set("context", v)}
                options={VITALS_CONTEXTS.map((c) => ({ value: c.value, label: c.label }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Taken on</Label>
              <Select
                value={form.subject_type}
                onChange={(v) => set("subject_type", v)}
                options={VITALS_SUBJECT_TYPES.map((s) => ({ value: s.value, label: s.label }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Age group</Label>
              <Select
                value={form.subject_age_range}
                onChange={(v) => set("subject_age_range", v)}
                options={AGE_RANGES}
              />
            </div>
            <div className="space-y-2">
              <Label>Course (optional)</Label>
              <Select
                value={form.course_id}
                onChange={(v) => set("course_id", v)}
                placeholder="Not tied to a course"
                options={enrollments.map((e) => ({
                  value: e.course_id,
                  label: e.course?.title || "Course",
                }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location / notes on where (optional)</Label>
            <Input
              value={form.setting}
              onChange={(e) => set("setting", e.target.value)}
              placeholder="Sim lab, Medic 4, Metro ER"
            />
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Measurements</p>
            <p className="text-xs text-muted-foreground mb-4">
              Leave anything you did not measure blank. At least one value is required.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Heart className="h-4 w-4 text-red-500" />
                  BP (mmHg)
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    placeholder="SYS"
                    value={form.bp_systolic}
                    onChange={(e) => set("bp_systolic", e.target.value)}
                  />
                  <span>/</span>
                  <Input
                    type="number"
                    placeholder="DIA"
                    value={form.bp_diastolic}
                    onChange={(e) => set("bp_diastolic", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>BP method</Label>
                <Select
                  value={form.bp_method}
                  onChange={(v) => set("bp_method", v)}
                  options={BP_METHODS.map((m) => ({ value: m.value, label: m.label }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Activity className="h-4 w-4 text-pink-500" />
                  Pulse (bpm)
                </Label>
                <Input
                  type="number"
                  value={form.pulse}
                  onChange={(e) => set("pulse", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Wind className="h-4 w-4 text-blue-500" />
                  RR (/min)
                </Label>
                <Input
                  type="number"
                  value={form.respiratory_rate}
                  onChange={(e) => set("respiratory_rate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>SpO2 (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={form.spo2}
                  onChange={(e) => set("spo2", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  Temp (°F)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => set("temperature", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Droplet className="h-4 w-4 text-rose-500" />
                  BGL (mg/dL)
                </Label>
                <Input
                  type="number"
                  value={form.blood_glucose}
                  onChange={(e) => set("blood_glucose", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Brain className="h-4 w-4 text-purple-500" />
                  GCS (3-15)
                </Label>
                <Input
                  type="number"
                  min="3"
                  max="15"
                  value={form.gcs}
                  onChange={(e) => set("gcs", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Pain (0-10)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={form.pain_scale}
                  onChange={(e) => set("pain_scale", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Skin</Label>
                <Input
                  value={form.skin}
                  onChange={(e) => set("skin", e.target.value)}
                  placeholder="Warm, pink, dry"
                />
              </div>

              <div className="space-y-2">
                <Label>Pupils</Label>
                <Input
                  value={form.pupils}
                  onChange={(e) => set("pupils", e.target.value)}
                  placeholder="PERRL"
                />
              </div>

              <div className="space-y-2">
                <Label>Pulse quality</Label>
                <Input
                  value={form.pulse_quality}
                  onChange={(e) => set("pulse_quality", e.target.value)}
                  placeholder="Strong, regular"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Anything worth remembering about this set"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createVital.isPending}>
              {createVital.isPending ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Save Set
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
