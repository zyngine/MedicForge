"use client";

import * as React from "react";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Spinner,
} from "@/components/ui";
import {
  Stethoscope,
  Clock,
  Users,
  CheckCircle,
  Plus,
  Calendar,
  MapPin,
  FileText,
  AlertCircle,
  ChevronRight,
  Activity,
  Heart,
  Syringe,
  Thermometer,
  CalendarPlus,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useMyClinicalLogs, useCreateClinicalLog, type ClinicalLogWithDetails } from "@/lib/hooks/use-clinical-logs";
import { useMyPatientContacts } from "@/lib/hooks/use-patient-contacts";
import { useMyEnrollments } from "@/lib/hooks/use-enrollments";
import { formatDate } from "@/lib/utils";

// TODO: These should come from course/program configuration
const REQUIRED_CLINICAL_HOURS = 48;
const REQUIRED_PATIENT_CONTACTS = 30;

const siteOptions = [
  { value: "hospital_er", label: "Hospital Emergency Room" },
  { value: "ambulance", label: "Ambulance Service" },
  { value: "fire_station", label: "Fire Station" },
  { value: "clinic", label: "Urgent Care Clinic" },
  { value: "other", label: "Other" },
];

const skillOptions = [
  { value: "patient_assessment", label: "Patient Assessment" },
  { value: "vital_signs", label: "Vital Signs" },
  { value: "airway_management", label: "Airway Management" },
  { value: "cpr", label: "CPR" },
  { value: "aed", label: "AED" },
  { value: "iv_access", label: "IV Access" },
  { value: "splinting", label: "Splinting" },
  { value: "wound_care", label: "Wound Care" },
  { value: "medication_admin", label: "Medication Administration" },
  { value: "ecg", label: "12-Lead ECG" },
];

export default function ClinicalTrackerPage() {
  const { data: logs = [], isLoading: logsLoading, error: logsError, refetch: refetchLogs } = useMyClinicalLogs();
  const { mutateAsync: createLog } = useCreateClinicalLog();
  const { contacts, isLoading: contactsLoading, error: contactsError, refetch: refetchContacts } = useMyPatientContacts();
  const { data: enrollments = [] } = useMyEnrollments();

  const [showLogModal, setShowLogModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form state for clinical log
  const [logForm, setLogForm] = React.useState({
    date: "",
    hours: "",
    siteType: "",
    siteName: "",
    supervisorName: "",
    supervisorCredentials: "",
    skills: [] as string[],
    notes: "",
    courseId: "",
  });

  // Form state for patient contact
  const [contactForm, setContactForm] = React.useState({
    date: "",
    patientAge: "",
    gender: "",
    chiefComplaint: "",
    assessment: "",
    interventions: [] as string[],
    wasTeamLead: false,
    notes: "",
  });

  const isLoading = logsLoading || contactsLoading;

  // Calculate stats from real data
  const hoursLogs = logs.filter((log) => log.log_type === "hours");
  const totalHours = hoursLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
  const verifiedHours = hoursLogs
    .filter((log) => log.verification_status === "verified")
    .reduce((sum, log) => sum + (log.hours || 0), 0);
  const pendingHours = hoursLogs
    .filter((log) => log.verification_status === "pending")
    .reduce((sum, log) => sum + (log.hours || 0), 0);

  const patientContactCount = contacts.length;
  const verifiedContacts = contacts.filter((c) => c.verification_status === "verified").length;
  const teamLeadCount = contacts.filter((c) => c.was_team_lead).length;

  const hoursRequired = REQUIRED_CLINICAL_HOURS;
  const contactsRequired = REQUIRED_PATIENT_CONTACTS;

  const hoursProgress = (totalHours / hoursRequired) * 100;
  const contactsProgress = (patientContactCount / contactsRequired) * 100;

  const handleSubmitLog = async () => {
    if (!logForm.courseId || !logForm.date || !logForm.hours) return;

    setIsSubmitting(true);
    try {
      await createLog({
        courseId: logForm.courseId,
        logType: "hours",
        date: logForm.date,
        hours: parseFloat(logForm.hours),
        siteName: logForm.siteName,
        siteType: logForm.siteType,
        supervisorName: logForm.supervisorName,
        supervisorCredentials: logForm.supervisorCredentials,
        skillsPerformed: logForm.skills,
        notes: logForm.notes,
      });
      setShowLogModal(false);
      setLogForm({
        date: "",
        hours: "",
        siteType: "",
        siteName: "",
        supervisorName: "",
        supervisorCredentials: "",
        skills: [],
        notes: "",
        courseId: "",
      });
    } catch (error) {
      console.error("Failed to submit log:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (logsError || contactsError) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-error mb-4" />
          <h3 className="text-lg font-medium mb-2">Error Loading Clinical Data</h3>
          <p className="text-muted-foreground mb-4">
            {logsError?.message || contactsError?.message}
          </p>
          <Button onClick={() => { refetchLogs(); refetchContacts(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clinical Tracker</h1>
          <p className="text-muted-foreground">
            Log your clinical hours, patient contacts, and skills.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/student/clinical/schedule">
              <CalendarPlus className="h-4 w-4 mr-2" />
              Book Shift
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/student/clinical/patient-contacts/new">
              <Users className="h-4 w-4 mr-2" />
              Log Patient Contact
            </Link>
          </Button>
          <Button onClick={() => setShowLogModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Clinical Hours
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clinical Hours</p>
                <p className="text-2xl font-bold">
                  {totalHours}/{hoursRequired}
                </p>
              </div>
            </div>
            <Progress value={Math.min(hoursProgress, 100)} size="md" />
            <p className="text-xs text-muted-foreground mt-2">
              {verifiedHours} hours verified, {pendingHours} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-success/10 text-success">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Patient Contacts</p>
                <p className="text-2xl font-bold">
                  {patientContactCount}/{contactsRequired}
                </p>
              </div>
            </div>
            <Progress value={Math.min(contactsProgress, 100)} size="md" variant="success" />
            <p className="text-xs text-muted-foreground mt-2">
              {verifiedContacts} verified, {teamLeadCount} as team lead
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-lg bg-info/10 text-info">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Skills Logged</p>
                <p className="text-2xl font-bold">
                  {hoursLogs.reduce((sum, log) => sum + (Array.isArray(log.skills_performed) ? log.skills_performed.length : 0), 0)}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              From {hoursLogs.length} clinical sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="hours">
        <TabsList>
          <TabsTrigger value="hours">Clinical Hours ({hoursLogs.length})</TabsTrigger>
          <TabsTrigger value="contacts">Patient Contacts ({contacts.length})</TabsTrigger>
        </TabsList>

        {/* Clinical Hours Tab */}
        <TabsContent value="hours">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Clinical Hour Logs</CardTitle>
                <CardDescription>Your submitted clinical hours and verification status</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {hoursLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No clinical hours logged</h3>
                  <p className="text-muted-foreground mb-4">
                    Start tracking your clinical experience by logging hours.
                  </p>
                  <Button onClick={() => setShowLogModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Log Clinical Hours
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {hoursLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{log.hours} hours</p>
                            <Badge
                              variant={
                                log.verification_status === "verified"
                                  ? "success"
                                  : log.verification_status === "pending"
                                  ? "warning"
                                  : "destructive"
                              }
                            >
                              {log.verification_status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {log.date ? formatDate(log.date) : "No date"}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            {log.site_name && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {log.site_name}
                              </span>
                            )}
                            {log.supervisor_name && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {log.supervisor_name}
                                {log.supervisor_credentials && `, ${log.supervisor_credentials}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {Array.isArray(log.skills_performed) ? log.skills_performed.length : 0} skills
                        </p>
                        <Button variant="ghost" size="sm" className="mt-1">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patient Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Patient Contact Log</CardTitle>
                <CardDescription>Record of patient interactions during clinical rotations</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No patient contacts logged</h3>
                  <p className="text-muted-foreground mb-4">
                    Document your patient interactions during clinical rotations.
                  </p>
                  <Button asChild>
                    <Link href="/student/clinical/patient-contacts/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Log Patient Contact
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Activity className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{contact.chief_complaint || "Patient Contact"}</p>
                              {contact.was_team_lead && (
                                <Badge variant="info" className="text-xs">Team Lead</Badge>
                              )}
                              <Badge
                                variant={
                                  contact.verification_status === "verified"
                                    ? "success"
                                    : contact.verification_status === "pending"
                                    ? "warning"
                                    : "destructive"
                                }
                              >
                                {contact.verification_status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {contact.patient_age_range} {contact.patient_gender} - {contact.created_at ? formatDate(contact.created_at) : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-12 space-y-2">
                        {contact.primary_impression && (
                          <div>
                            <p className="text-xs text-muted-foreground">Assessment</p>
                            <p className="text-sm">{contact.primary_impression}</p>
                          </div>
                        )}
                        {contact.skills_performed && contact.skills_performed.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground">Skills Performed</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {contact.skills_performed.map((skill, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Clinical Hours Modal */}
      <Modal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title="Log Clinical Hours"
        size="md"
      >
        <div className="space-y-4">
          {enrollments.length > 0 && (
            <div className="space-y-2">
              <Label>Course</Label>
              <Select
                options={enrollments.map((e) => ({
                  value: e.course?.id || "",
                  label: e.course?.title || "Unknown Course",
                }))}
                value={logForm.courseId}
                onChange={(value) => setLogForm({ ...logForm, courseId: value })}
                placeholder="Select course"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={logForm.date}
                onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input
                type="number"
                placeholder="8"
                value={logForm.hours}
                onChange={(e) => setLogForm({ ...logForm, hours: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Site Type</Label>
            <Select
              options={siteOptions}
              value={logForm.siteType}
              onChange={(value) => setLogForm({ ...logForm, siteType: value })}
              placeholder="Select site type"
            />
          </div>

          <div className="space-y-2">
            <Label>Site Name</Label>
            <Input
              placeholder="e.g., City Hospital ER"
              value={logForm.siteName}
              onChange={(e) => setLogForm({ ...logForm, siteName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supervisor Name</Label>
              <Input
                placeholder="e.g., Dr. Smith"
                value={logForm.supervisorName}
                onChange={(e) => setLogForm({ ...logForm, supervisorName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Credentials</Label>
              <Input
                placeholder="e.g., MD, Paramedic"
                value={logForm.supervisorCredentials}
                onChange={(e) => setLogForm({ ...logForm, supervisorCredentials: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills Performed</Label>
            <p className="text-xs text-muted-foreground">Select all skills you performed during this shift</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {skillOptions.map((skill) => (
                <label key={skill.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={logForm.skills.includes(skill.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLogForm({ ...logForm, skills: [...logForm.skills, skill.value] });
                      } else {
                        setLogForm({
                          ...logForm,
                          skills: logForm.skills.filter((s) => s !== skill.value),
                        });
                      }
                    }}
                  />
                  {skill.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes about this clinical shift..."
              rows={3}
              value={logForm.notes}
              onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowLogModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitLog}
              isLoading={isSubmitting}
              disabled={!logForm.courseId || !logForm.date || !logForm.hours}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit for Verification
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
