"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Input,
} from "@/components/ui";
import {
  ArrowLeft,
  Search,
  FileText,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Stethoscope,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import type { ClinicalPatientContactWithDetails } from "@/types";
import { PATIENT_AGE_LABELS } from "@/types";
import { format, addDays } from "date-fns";

// Mock data
const mockPatientContacts: ClinicalPatientContactWithDetails[] = [
  {
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
    ],
    skills_performed: ["12-Lead ECG", "IV Access", "Oxygen Administration"],
    medications_given: [
      { medication: "Aspirin", dose: "324mg", route: "PO", time: "14:35" },
      { medication: "Nitroglycerin", dose: "0.4mg", route: "SL", time: "14:40" },
    ],
    procedures: ["12-Lead ECG", "Peripheral IV"],
    disposition: "Transported",
    transport_destination: "Memorial Hospital",
    transport_mode: "ALS",
    was_team_lead: true,
    role_description: "Team Lead - Assessed patient, performed 12-lead, administered medications",
    narrative:
      "Responded to 65 y/o male with chest pain. Patient stated pain began 30 minutes ago while at rest. Pain described as crushing, 7/10, radiating to left arm. History of HTN, DM. Initial vitals showed elevated BP and HR. 12-lead showed ST elevation in leads V1-V4. Established IV access, administered ASA and NTG with some relief. Transported emergent to Memorial Hospital.",
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
  },
  {
    id: "pc2",
    tenant_id: "t1",
    booking_id: "b2",
    student_id: "student2",
    course_id: "course1",
    patient_age_range: "adolescent",
    patient_gender: "Female",
    call_type: "911",
    call_nature: "Emergency",
    dispatch_complaint: "MVA",
    chief_complaint: "Neck pain following MVA",
    primary_impression: "Cervical Spine Injury",
    secondary_impression: null,
    level_of_consciousness: "Alert",
    mental_status: "Oriented x4",
    vitals: [
      {
        time: "10:15",
        bp_systolic: 118,
        bp_diastolic: 72,
        pulse: 88,
        respiratory_rate: 16,
        spo2: 99,
        temperature: 98.2,
        gcs: 15,
        pain_scale: 5,
      },
    ],
    skills_performed: ["Spinal Immobilization", "Primary Assessment"],
    medications_given: [],
    procedures: ["Cervical Collar Application", "Long Spine Board"],
    disposition: "Transported",
    transport_destination: "County General",
    transport_mode: "BLS",
    was_team_lead: false,
    role_description: "Assisted with spinal immobilization and patient packaging",
    narrative:
      "Responded to MVA with 17 y/o female driver. Vehicle struck from behind at intersection. Patient complaining of neck pain. MOI suggests potential c-spine injury. Applied cervical collar and immobilized on long spine board. No other injuries noted. Transported to County General for evaluation.",
    preceptor_feedback: null,
    preceptor_signature: null,
    verification_status: "pending",
    verified_by: null,
    verified_at: null,
    created_at: format(addDays(new Date(), -2), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    updated_at: format(addDays(new Date(), -2), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    student: {
      id: "student2",
      full_name: "Jane Doe",
      email: "jane.doe@student.edu",
    },
  },
  {
    id: "pc3",
    tenant_id: "t1",
    booking_id: "b3",
    student_id: "student3",
    course_id: "course1",
    patient_age_range: "geriatric",
    patient_gender: "Female",
    call_type: "911",
    call_nature: "Emergency",
    dispatch_complaint: "Difficulty Breathing",
    chief_complaint: "Shortness of breath, productive cough",
    primary_impression: "COPD Exacerbation",
    secondary_impression: "Pneumonia",
    level_of_consciousness: "Alert",
    mental_status: "Oriented x4",
    vitals: [
      {
        time: "08:45",
        bp_systolic: 142,
        bp_diastolic: 88,
        pulse: 110,
        respiratory_rate: 28,
        spo2: 88,
        temperature: 100.4,
        gcs: 15,
        pain_scale: 0,
      },
    ],
    skills_performed: ["Nebulizer Treatment", "Oxygen Administration", "IV Access"],
    medications_given: [
      { medication: "Albuterol", dose: "2.5mg", route: "Nebulizer", time: "08:50" },
    ],
    procedures: ["Nebulizer", "Nasal Cannula O2"],
    disposition: "Transported",
    transport_destination: "Memorial Hospital",
    transport_mode: "ALS",
    was_team_lead: true,
    role_description: "Team Lead - Full assessment and treatment",
    narrative:
      "Responded to 78 y/o female with difficulty breathing. Patient has history of COPD, uses home O2. Increased work of breathing, diminished lung sounds bilaterally with wheezes. SpO2 88% on room air. Administered albuterol nebulizer with improvement. Applied O2 via NC at 4L. Transported to Memorial Hospital.",
    preceptor_feedback: "Good assessment and treatment. Consider documenting lung sounds before and after treatment.",
    preceptor_signature: "Mike Thompson, Paramedic",
    verification_status: "verified",
    verified_by: "instructor1",
    verified_at: format(addDays(new Date(), -1), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    created_at: format(addDays(new Date(), -3), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    updated_at: format(addDays(new Date(), -1), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
    student: {
      id: "student3",
      full_name: "Mike Johnson",
      email: "mike.johnson@student.edu",
    },
  },
];

type VerificationStatus = "all" | "pending" | "verified" | "rejected";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
    color: "text-yellow-600",
  },
  verified: {
    label: "Verified",
    variant: "default" as const,
    icon: CheckCircle,
    color: "text-green-600",
  },
  rejected: {
    label: "Rejected",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-red-600",
  },
};

export default function PatientContactsPage() {
  const [contacts, setContacts] = useState<ClinicalPatientContactWithDetails[]>(mockPatientContacts);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<VerificationStatus>("pending");

  const handleVerify = (contactId: string) => {
    setContacts(
      contacts.map((c) =>
        c.id === contactId
          ? {
              ...c,
              verification_status: "verified" as const,
              verified_by: "instructor1",
              verified_at: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const handleReject = (contactId: string) => {
    setContacts(
      contacts.map((c) =>
        c.id === contactId
          ? {
              ...c,
              verification_status: "rejected" as const,
              verified_by: "instructor1",
              verified_at: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.chief_complaint?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.primary_impression?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      activeTab === "all" || contact.verification_status === activeTab;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    pending: contacts.filter((c) => c.verification_status === "pending").length,
    verified: contacts.filter((c) => c.verification_status === "verified").length,
    rejected: contacts.filter((c) => c.verification_status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/instructor/clinical"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clinical Management
        </Link>
        <h1 className="text-2xl font-bold">Patient Contacts</h1>
        <p className="text-muted-foreground">
          Review and verify student patient contact documentation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.verified}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 text-red-600">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by student, complaint, or impression..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="pending"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as VerificationStatus)}
      >
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {stats.pending > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredContacts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Patient Contacts Found</h3>
                <p className="text-muted-foreground">
                  {activeTab === "pending"
                    ? "No patient contacts are awaiting review."
                    : activeTab === "verified"
                    ? "No verified patient contacts yet."
                    : activeTab === "rejected"
                    ? "No rejected patient contacts."
                    : "No patient contacts match your search."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredContacts.map((contact) => {
                const statusConfig =
                  STATUS_CONFIG[contact.verification_status as keyof typeof STATUS_CONFIG];
                const StatusIcon = statusConfig.icon;

                return (
                  <Card key={contact.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{contact.student?.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(
                                  new Date(contact.created_at),
                                  "MMM d, yyyy 'at' h:mm a"
                                )}
                              </p>
                            </div>
                            <Badge variant={statusConfig.variant} className="ml-auto">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>

                          {/* Patient Info */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50">
                            <div>
                              <p className="text-xs text-muted-foreground">Age Range</p>
                              <p className="text-sm font-medium">
                                {PATIENT_AGE_LABELS[contact.patient_age_range]}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Gender</p>
                              <p className="text-sm font-medium">{contact.patient_gender}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Call Type</p>
                              <p className="text-sm font-medium">{contact.call_type}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Team Lead</p>
                              <p className="text-sm font-medium">
                                {contact.was_team_lead ? "Yes" : "No"}
                              </p>
                            </div>
                          </div>

                          {/* Chief Complaint & Impression */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                <span className="font-medium">Chief Complaint:</span>{" "}
                                {contact.chief_complaint}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                <span className="font-medium">Primary Impression:</span>{" "}
                                {contact.primary_impression}
                              </span>
                            </div>
                          </div>

                          {/* Skills */}
                          {contact.skills_performed && contact.skills_performed.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {contact.skills_performed.map((skill, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Preceptor Feedback */}
                          {contact.preceptor_feedback && (
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                              <p className="text-xs font-medium text-blue-800 mb-1">
                                Preceptor Feedback
                              </p>
                              <p className="text-sm text-blue-700">{contact.preceptor_feedback}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/instructor/clinical/patient-contacts/${contact.id}`}>
                              View Details
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>

                          {contact.verification_status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleVerify(contact.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(contact.id)}
                                className="text-red-600 hover:text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
