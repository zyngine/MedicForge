"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
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
  CheckCircle,
  XCircle,
  Clock,
  Stethoscope,
  AlertCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { PATIENT_AGE_LABELS } from "@/types";
import { usePatientContacts } from "@/lib/hooks/use-patient-contacts";
import { format } from "date-fns";

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
  const {
    contacts,
    isLoading,
    error,
    verifyContact,
    rejectContact,
  } = usePatientContacts();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<VerificationStatus>("pending");

  const handleVerify = async (contactId: string) => {
    await verifyContact(contactId);
  };

  const handleReject = async (contactId: string) => {
    await rejectContact(contactId, "Rejected by instructor");
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
          href="/instructor/clinical"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clinical Management
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
