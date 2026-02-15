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
  Spinner,
  Modal,
  ModalFooter,
  Input,
  Label,
  Alert,
} from "@/components/ui";
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Award,
  ChevronRight,
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";

// Placeholder data
const MOCK_PENDING_VERIFICATIONS = [
  {
    id: "1",
    employeeName: "John Smith",
    employeeId: "emp-001",
    skillName: "12-Lead ECG Interpretation",
    submittedDate: "2025-02-10",
    certLevel: "Paramedic",
    notes: "Completed 50 ECG interpretations with 95% accuracy",
  },
  {
    id: "2",
    employeeName: "Jane Doe",
    employeeId: "emp-002",
    skillName: "IV Therapy",
    submittedDate: "2025-02-08",
    certLevel: "EMT",
    notes: "Successfully demonstrated 10 IV starts",
  },
  {
    id: "3",
    employeeName: "Mike Johnson",
    employeeId: "emp-003",
    skillName: "Airway Management",
    submittedDate: "2025-02-05",
    certLevel: "Paramedic",
    notes: "Completed advanced airway training module",
  },
  {
    id: "4",
    employeeName: "Sarah Williams",
    employeeId: "emp-004",
    skillName: "BLS/CPR",
    submittedDate: "2025-02-12",
    certLevel: "Paramedic",
    notes: "Annual recertification completed",
  },
];

function VerificationCard({
  verification,
  onApprove,
  onReject,
}: {
  verification: typeof MOCK_PENDING_VERIFICATIONS[0];
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{verification.skillName}</h3>
              <Badge variant="outline">{verification.certLevel}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {verification.employeeName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(verification.submittedDate).toLocaleDateString()}
              </span>
            </div>
            {verification.notes && (
              <p className="text-sm text-muted-foreground mt-3 p-3 bg-muted rounded-lg">
                {verification.notes}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={onReject}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button className="flex-1" onClick={onApprove}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PendingVerificationsPage() {
  const { isMedicalDirector, isAgencyAdmin } = useAgencyRole();
  const [verifications, setVerifications] = React.useState(MOCK_PENDING_VERIFICATIONS);
  const [isLoading] = React.useState(false);
  const [selectedVerification, setSelectedVerification] = React.useState<
    typeof MOCK_PENDING_VERIFICATIONS[0] | null
  >(null);
  const [actionType, setActionType] = React.useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAction = (
    verification: typeof MOCK_PENDING_VERIFICATIONS[0],
    action: "approve" | "reject"
  ) => {
    setSelectedVerification(verification);
    setActionType(action);
  };

  const confirmAction = async () => {
    if (!selectedVerification || !actionType) return;

    setIsSubmitting(true);

    // TODO: Implement API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Remove from list
    setVerifications((prev) =>
      prev.filter((v) => v.id !== selectedVerification.id)
    );

    setIsSubmitting(false);
    setSelectedVerification(null);
    setActionType(null);
    setRejectionReason("");
  };

  const closeModal = () => {
    setSelectedVerification(null);
    setActionType(null);
    setRejectionReason("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pending Verifications</h1>
          <p className="text-muted-foreground">
            Review and approve employee competency submissions
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {verifications.length} pending
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-warning/10 text-warning">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{verifications.length}</p>
              <p className="text-sm text-muted-foreground">Awaiting Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-success/10 text-success">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">24</p>
              <p className="text-sm text-muted-foreground">Approved This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-muted text-muted-foreground">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">156</p>
              <p className="text-sm text-muted-foreground">Total Verified</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Verifications */}
      {verifications.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {verifications.map((verification) => (
            <VerificationCard
              key={verification.id}
              verification={verification}
              onApprove={() => handleAction(verification, "approve")}
              onReject={() => handleAction(verification, "reject")}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success opacity-50" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">No pending verifications to review</p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!selectedVerification && !!actionType}
        onClose={closeModal}
        title={actionType === "approve" ? "Approve Verification" : "Reject Verification"}
      >
        {selectedVerification && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{selectedVerification.skillName}</p>
              <p className="text-sm text-muted-foreground">
                {selectedVerification.employeeName}
              </p>
            </div>

            {actionType === "approve" ? (
              <Alert variant="success">
                <CheckCircle className="h-4 w-4" />
                <span>
                  This will verify the employee's competency and record your approval.
                </span>
              </Alert>
            ) : (
              <>
                <Alert variant="error">
                  <XCircle className="h-4 w-4" />
                  <span>
                    The employee will be notified and may need to resubmit.
                  </span>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="rejectionReason">
                    Reason for Rejection
                  </Label>
                  <Input
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide feedback..."
                  />
                </div>
              </>
            )}

            <ModalFooter>
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                variant={actionType === "approve" ? "default" : "destructive"}
                onClick={confirmAction}
                disabled={isSubmitting || (actionType === "reject" && !rejectionReason)}
              >
                {isSubmitting ? (
                  <Spinner size="sm" className="mr-2" />
                ) : actionType === "approve" ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
}
