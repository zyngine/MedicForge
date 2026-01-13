"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  ArrowLeft,
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Stethoscope,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { PATIENT_AGE_LABELS } from "@/types";
import { useMyPatientContacts } from "@/lib/hooks/use-patient-contacts";
import { format } from "date-fns";

type StatusFilter = "all" | "pending" | "verified" | "rejected";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
    color: "text-yellow-600",
    bg: "bg-yellow-100",
  },
  verified: {
    label: "Verified",
    variant: "default" as const,
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-100",
  },
  rejected: {
    label: "Rejected",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-100",
  },
};

export default function StudentPatientContactsPage() {
  const { contacts, isLoading, error } = useMyPatientContacts();
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");

  const filteredContacts = contacts.filter((contact) => {
    return activeTab === "all" || contact.verification_status === activeTab;
  });

  const stats = {
    total: contacts.length,
    pending: contacts.filter((c) => c.verification_status === "pending").length,
    verified: contacts.filter((c) => c.verification_status === "verified").length,
    teamLead: contacts.filter((c) => c.was_team_lead).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/student/clinical"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clinical Tracker
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Patient Contacts</h3>
            <p className="text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/student/clinical"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clinical Tracker
          </Link>
          <h1 className="text-2xl font-bold">Patient Contacts</h1>
          <p className="text-muted-foreground">
            Document and track your patient encounters during clinical rotations
          </p>
        </div>
        <Button asChild>
          <Link href="/student/clinical/patient-contacts/new">
            <Plus className="h-4 w-4 mr-2" />
            New Contact
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Contacts</p>
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
            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.teamLead}</p>
              <p className="text-xs text-muted-foreground">Team Lead</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as StatusFilter)}
      >
        <TabsList>
          <TabsTrigger value="all">All ({contacts.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({stats.verified})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredContacts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Patient Contacts</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === "pending"
                    ? "You have no patient contacts awaiting verification."
                    : activeTab === "verified"
                    ? "You haven't had any patient contacts verified yet."
                    : "Start documenting your patient encounters from clinical shifts."}
                </p>
                <Button asChild>
                  <Link href="/student/clinical/patient-contacts/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Document Patient Contact
                  </Link>
                </Button>
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
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${statusConfig.bg} ${statusConfig.color}`}>
                            <Stethoscope className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{contact.primary_impression}</p>
                              <Badge variant={statusConfig.variant}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                              {contact.was_team_lead && (
                                <Badge variant="outline">Team Lead</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {PATIENT_AGE_LABELS[contact.patient_age_range]} {contact.patient_gender} -{" "}
                              {contact.chief_complaint}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(contact.created_at), "MMM d, yyyy")} -{" "}
                              {contact.call_type} Call
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {contact.skills_performed && contact.skills_performed.length > 0 && (
                            <div className="hidden md:flex flex-wrap gap-1 max-w-xs">
                              {contact.skills_performed.slice(0, 3).map((skill, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {contact.skills_performed.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{contact.skills_performed.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/student/clinical/patient-contacts/${contact.id}`}>
                              View
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>

                      {/* Preceptor Feedback */}
                      {contact.preceptor_feedback && (
                        <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <p className="text-xs font-medium text-blue-800 mb-1">
                            Instructor Feedback
                          </p>
                          <p className="text-sm text-blue-700">{contact.preceptor_feedback}</p>
                        </div>
                      )}
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
