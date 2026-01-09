"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Textarea,
} from "@/components/ui";
import {
  ArrowLeft,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Stethoscope,
  Heart,
  Thermometer,
  Wind,
  Brain,
  Pill,
  Truck,
  FileText,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import type { ClinicalPatientContact } from "@/types";
import { PATIENT_AGE_LABELS } from "@/types";
import { format, addDays } from "date-fns";

// Mock data
const mockContact: ClinicalPatientContact = {
  id: "pc1",
  tenant_id: "t1",
  booking_id: "b1",
  student_id: "student1",
  course_id: "course1",
  patient_age_range: "adult",
  patient_gender: "Male",
  call_type: "911",
  call_nature: "Emergency",
  dispatch_complaint: "Chest Pain",
  chief_complaint: "Chest pain radiating to left arm",
  primary_impression: "Acute Coronary Syndrome",
  secondary_impression: "Hypertension",
  level_of_consciousness: "Alert",
  mental_status: "Oriented x4",
  vitals: [
    {
      time: "14:30",
      bp_systolic: 158,
      bp_diastolic: 92,
      pulse: 102,
      respiratory_rate: 20,
      spo2: 96,
      temperature: 98.6,
      gcs: 15,
      pain_scale: 7,
    },
    {
      time: "14:45",
      bp_systolic: 142,
      bp_diastolic: 86,
      pulse: 92,
      respiratory_rate: 18,
      spo2: 98,
      temperature: 98.6,
      gcs: 15,
      pain_scale: 4,
    },
  ],
  skills_performed: ["12-Lead ECG", "IV Access", "Oxygen Administration", "Cardiac Monitoring"],
  medications_given: [
    { medication: "Aspirin", dose: "324mg", route: "PO", time: "14:35" },
    { medication: "Nitroglycerin", dose: "0.4mg", route: "SL", time: "14:40" },
  ],
  procedures: ["12-Lead ECG", "Peripheral IV", "Nasal Cannula O2"],
  disposition: "Transported",
  transport_destination: "Memorial Hospital",
  transport_mode: "ALS",
  was_team_lead: true,
  role_description:
    "Team Lead - Assessed patient, performed 12-lead, established IV access, administered medications per protocol",
  narrative:
    "Responded to 65 y/o male with chest pain. Patient stated pain began approximately 30 minutes ago while at rest. Pain described as crushing, 7/10 intensity, radiating to left arm with associated diaphoresis. Patient has history of HTN, DM, hyperlipidemia. Takes Lisinopril, Metformin, and Atorvastatin daily. Initial vitals showed elevated BP and HR. 12-lead showed ST elevation in leads V1-V4 concerning for anterior STEMI. Established 18g IV access in left AC. Administered ASA 324mg PO and NTG 0.4mg SL with improvement of pain from 7/10 to 4/10. Repeat vitals showed improved BP and HR. Transmitted 12-lead to receiving hospital and gave report. Transported emergent to Memorial Hospital cardiac cath lab.",
  preceptor_feedback: null,
  preceptor_signature: null,
  verification_status: "pending",
  verified_by: null,
  verified_at: null,
  created_at: format(addDays(new Date(), -1), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
  updated_at: format(addDays(new Date(), -1), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
  student: {
    id: "student1",
    full_name: "John Smith",
    email: "john.smith@student.edu",
  },
};

const STATUS_CONFIG = {
  pending: {
    label: "Pending Review",
    variant: "secondary" as const,
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-700",
  },
  verified: {
    label: "Verified",
    variant: "default" as const,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
  },
  rejected: {
    label: "Rejected",
    variant: "destructive" as const,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
  },
};

export default function PatientContactDetailPage() {
  const params = useParams();
  const contactId = params.contactId as string;

  const [contact, setContact] = useState<ClinicalPatientContact>(mockContact);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusConfig = STATUS_CONFIG[contact.verification_status as keyof typeof STATUS_CONFIG];

  const handleVerify = async () => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setContact({
        ...contact,
        verification_status: "verified",
        preceptor_feedback: feedback || null,
        verified_by: "instructor1",
        verified_at: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!feedback) {
      alert("Please provide feedback when rejecting a patient contact.");
      return;
    }
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setContact({
        ...contact,
        verification_status: "rejected",
        preceptor_feedback: feedback,
        verified_by: "instructor1",
        verified_at: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/instructor/clinical/patient-contacts"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Patient Contacts
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Patient Contact Report</h1>
            <p className="text-muted-foreground">
              Submitted by {contact.student?.full_name} on{" "}
              {format(new Date(contact.created_at), "MMMM d, yyyy")}
            </p>
          </div>
          <Badge variant={statusConfig.variant} className="text-sm">
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`p-4 rounded-lg border ${statusConfig.bgColor} ${statusConfig.borderColor}`}
      >
        <div className="flex items-center gap-3">
          {contact.verification_status === "pending" && (
            <Clock className={`h-5 w-5 ${statusConfig.textColor}`} />
          )}
          {contact.verification_status === "verified" && (
            <CheckCircle className={`h-5 w-5 ${statusConfig.textColor}`} />
          )}
          {contact.verification_status === "rejected" && (
            <XCircle className={`h-5 w-5 ${statusConfig.textColor}`} />
          )}
          <div>
            <p className={`font-medium ${statusConfig.textColor}`}>
              {contact.verification_status === "pending"
                ? "This patient contact is awaiting review"
                : contact.verification_status === "verified"
                ? "This patient contact has been verified"
                : "This patient contact has been rejected"}
            </p>
            {contact.verified_at && (
              <p className={`text-sm ${statusConfig.textColor}`}>
                {format(new Date(contact.verified_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Demographics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Age Range</p>
                  <p className="font-medium">
                    {PATIENT_AGE_LABELS[contact.patient_age_range]}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium">{contact.patient_gender}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Call Type</p>
                  <p className="font-medium">{contact.call_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Call Nature</p>
                  <p className="font-medium">{contact.call_nature}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chief Complaint & Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dispatch Complaint</p>
                  <p className="font-medium">{contact.dispatch_complaint}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chief Complaint</p>
                  <p className="font-medium">{contact.chief_complaint}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Primary Impression</p>
                  <p className="font-medium text-primary">{contact.primary_impression}</p>
                </div>
                {contact.secondary_impression && (
                  <div>
                    <p className="text-sm text-muted-foreground">Secondary Impression</p>
                    <p className="font-medium">{contact.secondary_impression}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Level of Consciousness</p>
                  <p className="font-medium">{contact.level_of_consciousness}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mental Status</p>
                  <p className="font-medium">{contact.mental_status}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vital Signs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Vital Signs
              </CardTitle>
              <CardDescription>
                {contact.vitals?.length || 0} set(s) documented
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Time</th>
                      <th className="text-left py-2 font-medium">BP</th>
                      <th className="text-left py-2 font-medium">HR</th>
                      <th className="text-left py-2 font-medium">RR</th>
                      <th className="text-left py-2 font-medium">SpO2</th>
                      <th className="text-left py-2 font-medium">Temp</th>
                      <th className="text-left py-2 font-medium">GCS</th>
                      <th className="text-left py-2 font-medium">Pain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contact.vitals?.map((vital, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-2">{vital.time}</td>
                        <td className="py-2">
                          {vital.bp_systolic}/{vital.bp_diastolic}
                        </td>
                        <td className="py-2">{vital.pulse}</td>
                        <td className="py-2">{vital.respiratory_rate}</td>
                        <td className="py-2">{vital.spo2}%</td>
                        <td className="py-2">{vital.temperature}°F</td>
                        <td className="py-2">{vital.gcs}</td>
                        <td className="py-2">{vital.pain_scale}/10</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Interventions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Interventions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Skills */}
              {contact.skills_performed && contact.skills_performed.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Skills Performed</p>
                  <div className="flex flex-wrap gap-2">
                    {contact.skills_performed.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Medications */}
              {contact.medications_given && contact.medications_given.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Medications Administered</p>
                  <div className="space-y-2">
                    {contact.medications_given.map((med, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{med.medication}</p>
                          <p className="text-sm text-muted-foreground">
                            {med.dose} {med.route}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">{med.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Procedures */}
              {contact.procedures && contact.procedures.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Procedures</p>
                  <div className="flex flex-wrap gap-2">
                    {contact.procedures.map((procedure, index) => (
                      <Badge key={index} variant="outline">
                        {procedure}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disposition */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Disposition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Disposition</p>
                  <p className="font-medium">{contact.disposition}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="font-medium">{contact.transport_destination}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transport Mode</p>
                  <p className="font-medium">{contact.transport_mode}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Narrative */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Narrative
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {contact.narrative}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{contact.student?.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {contact.student?.email}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Role</p>
                <Badge variant={contact.was_team_lead ? "default" : "secondary"}>
                  {contact.was_team_lead ? "Team Lead" : "Team Member"}
                </Badge>
              </div>

              {contact.role_description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Role Description</p>
                  <p className="text-sm">{contact.role_description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructor Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Instructor Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.preceptor_feedback ? (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm">{contact.preceptor_feedback}</p>
                </div>
              ) : contact.verification_status === "pending" ? (
                <>
                  <Textarea
                    placeholder="Add feedback for the student (optional for verification, required for rejection)..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={handleVerify}
                      disabled={isSubmitting}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 hover:text-red-600"
                      onClick={handleReject}
                      disabled={isSubmitting}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No feedback was provided.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Submission Info */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-sm font-medium">
                  {format(new Date(contact.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              {contact.verified_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Reviewed</p>
                  <p className="text-sm font-medium">
                    {format(new Date(contact.verified_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
