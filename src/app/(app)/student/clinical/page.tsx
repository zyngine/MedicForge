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
} from "lucide-react";

// Mock data
const clinicalRequirements = {
  hoursRequired: 48,
  hoursCompleted: 24,
  hoursVerified: 20,
  patientContactsRequired: 30,
  patientContactsCompleted: 15,
  skillCategories: [
    { name: "Airway Management", required: 5, completed: 3, verified: 2 },
    { name: "Patient Assessment", required: 10, completed: 8, verified: 7 },
    { name: "Cardiac Care", required: 5, completed: 2, verified: 2 },
    { name: "Trauma Care", required: 5, completed: 4, verified: 3 },
    { name: "Medical Emergencies", required: 5, completed: 3, verified: 3 },
  ],
};

const recentLogs = [
  {
    id: "1",
    date: "Feb 15, 2024",
    hours: 8,
    site: "City Hospital ER",
    supervisor: "Dr. Williams, MD",
    status: "verified",
    patientContacts: 4,
    skills: ["Patient Assessment", "Vital Signs", "IV Access"],
  },
  {
    id: "2",
    date: "Feb 10, 2024",
    hours: 6,
    site: "Metro Ambulance Service",
    supervisor: "Paramedic Johnson",
    status: "pending",
    patientContacts: 3,
    skills: ["Patient Assessment", "CPR", "AED"],
  },
  {
    id: "3",
    date: "Feb 5, 2024",
    hours: 8,
    site: "County Hospital",
    supervisor: "Dr. Martinez, MD",
    status: "verified",
    patientContacts: 5,
    skills: ["Airway Management", "Splinting", "Wound Care"],
  },
  {
    id: "4",
    date: "Feb 1, 2024",
    hours: 2,
    site: "Fire Station 12",
    supervisor: "Lt. Brown",
    status: "rejected",
    patientContacts: 0,
    rejectionReason: "Missing supervisor credentials",
    skills: [],
  },
];

const patientContacts = [
  {
    id: "1",
    date: "Feb 15, 2024",
    age: "65",
    gender: "Male",
    chiefComplaint: "Chest Pain",
    assessment: "Suspected MI",
    interventions: ["12-lead ECG", "O2 Therapy", "IV Access"],
    wasTeamLead: true,
  },
  {
    id: "2",
    date: "Feb 15, 2024",
    age: "28",
    gender: "Female",
    chiefComplaint: "Difficulty Breathing",
    assessment: "Asthma Exacerbation",
    interventions: ["Nebulizer Treatment", "Vital Signs"],
    wasTeamLead: false,
  },
  {
    id: "3",
    date: "Feb 10, 2024",
    age: "45",
    gender: "Male",
    chiefComplaint: "Fall",
    assessment: "Hip Fracture",
    interventions: ["Splinting", "Pain Assessment", "C-Spine Precautions"],
    wasTeamLead: true,
  },
];

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
  const [showLogModal, setShowLogModal] = React.useState(false);
  const [showContactModal, setShowContactModal] = React.useState(false);

  const hoursProgress = (clinicalRequirements.hoursCompleted / clinicalRequirements.hoursRequired) * 100;
  const contactsProgress = (clinicalRequirements.patientContactsCompleted / clinicalRequirements.patientContactsRequired) * 100;

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
          <Button variant="outline" onClick={() => setShowContactModal(true)}>
            <Users className="h-4 w-4 mr-2" />
            Log Patient Contact
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
                  {clinicalRequirements.hoursCompleted}/{clinicalRequirements.hoursRequired}
                </p>
              </div>
            </div>
            <Progress value={hoursProgress} size="md" />
            <p className="text-xs text-muted-foreground mt-2">
              {clinicalRequirements.hoursVerified} hours verified
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
                  {clinicalRequirements.patientContactsCompleted}/{clinicalRequirements.patientContactsRequired}
                </p>
              </div>
            </div>
            <Progress value={contactsProgress} size="md" variant="success" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round(contactsProgress)}% complete
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
                <p className="text-sm text-muted-foreground">Skills Verified</p>
                <p className="text-2xl font-bold">
                  {clinicalRequirements.skillCategories.reduce((sum, s) => sum + s.verified, 0)}/
                  {clinicalRequirements.skillCategories.reduce((sum, s) => sum + s.required, 0)}
                </p>
              </div>
            </div>
            <Progress
              value={
                (clinicalRequirements.skillCategories.reduce((sum, s) => sum + s.verified, 0) /
                  clinicalRequirements.skillCategories.reduce((sum, s) => sum + s.required, 0)) *
                100
              }
              size="md"
              variant="default"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {clinicalRequirements.skillCategories.filter((s) => s.verified >= s.required).length} of{" "}
              {clinicalRequirements.skillCategories.length} categories complete
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="hours">
        <TabsList>
          <TabsTrigger value="hours">Clinical Hours</TabsTrigger>
          <TabsTrigger value="contacts">Patient Contacts</TabsTrigger>
          <TabsTrigger value="skills">Skills Progress</TabsTrigger>
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
              <div className="space-y-4">
                {recentLogs.map((log) => (
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
                              log.status === "verified"
                                ? "success"
                                : log.status === "pending"
                                ? "warning"
                                : "destructive"
                            }
                          >
                            {log.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{log.date}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {log.site}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {log.supervisor}
                          </span>
                        </div>
                        {log.rejectionReason && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {log.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{log.patientContacts} contacts</p>
                      <p className="text-xs text-muted-foreground">
                        {log.skills.length} skills performed
                      </p>
                      <Button variant="ghost" size="sm" className="mt-1">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
              <div className="space-y-4">
                {patientContacts.map((contact) => (
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
                            <p className="font-medium">{contact.chiefComplaint}</p>
                            {contact.wasTeamLead && (
                              <Badge variant="info" className="text-xs">Team Lead</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {contact.age} y/o {contact.gender} - {contact.date}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-12 space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Assessment</p>
                        <p className="text-sm">{contact.assessment}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Interventions</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {contact.interventions.map((intervention, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {intervention}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Progress Tab */}
        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle>Skills Progress</CardTitle>
              <CardDescription>Track your progress toward NREMT skill requirements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {clinicalRequirements.skillCategories.map((category, index) => {
                  const progress = (category.completed / category.required) * 100;
                  const verifiedProgress = (category.verified / category.required) * 100;
                  const isComplete = category.verified >= category.required;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isComplete ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <Stethoscope className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">{category.verified}</span>
                          <span className="text-muted-foreground">/{category.required} verified</span>
                        </div>
                      </div>
                      <div className="relative">
                        <Progress value={progress} size="md" className="bg-muted" />
                        <div
                          className="absolute top-0 left-0 h-full bg-success rounded-full transition-all"
                          style={{ width: `${verifiedProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{category.completed} performed</span>
                        <span>{category.verified} verified</span>
                      </div>
                    </div>
                  );
                })}
              </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input type="number" placeholder="8" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Site Type</Label>
            <Select options={siteOptions} value="" onChange={() => {}} placeholder="Select site type" />
          </div>

          <div className="space-y-2">
            <Label>Site Name</Label>
            <Input placeholder="e.g., City Hospital ER" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supervisor Name</Label>
              <Input placeholder="e.g., Dr. Smith" />
            </div>
            <div className="space-y-2">
              <Label>Credentials</Label>
              <Input placeholder="e.g., MD, Paramedic" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills Performed</Label>
            <p className="text-xs text-muted-foreground">Select all skills you performed during this shift</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {skillOptions.map((skill) => (
                <label key={skill.value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  {skill.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Additional notes about this clinical shift..." rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowLogModal(false)}>
              Cancel
            </Button>
            <Button>
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit for Verification
            </Button>
          </div>
        </div>
      </Modal>

      {/* Log Patient Contact Modal */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Log Patient Contact"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" />
            </div>
            <div className="space-y-2">
              <Label>Patient Age</Label>
              <Input type="number" placeholder="45" />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ]}
                value=""
                onChange={() => {}}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chief Complaint</Label>
            <Input placeholder="e.g., Chest Pain, Difficulty Breathing" />
          </div>

          <div className="space-y-2">
            <Label>Your Assessment</Label>
            <Textarea placeholder="What did you assess this patient as having?" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Interventions Performed</Label>
            <p className="text-xs text-muted-foreground">Select all interventions you performed</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {skillOptions.map((skill) => (
                <label key={skill.value} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  {skill.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-sm font-medium">I was team lead for this patient</span>
            </label>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea placeholder="Any additional notes about this patient contact..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowContactModal(false)}>
              Cancel
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Patient Contact
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
