"use client";

import * as React from "react";
import {
  Card,
  CardContent,
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
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";
import { useAgencyVerifications } from "@/lib/hooks/use-agency-data";
import type { PendingVerification } from "@/lib/hooks/use-agency-data";

function VerificationCard({
  verification,
  onApprove,
  onReject,
}: {
  verification: PendingVerification;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{verification.skill?.name ?? "—"}</h3>
              <Badge variant="outline">{verification.employee?.certification_level}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {verification.employee
                  ? `${verification.employee.first_name} ${verification.employee.last_name}`
                  : "—"}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(verification.updated_at).toLocaleDateString()}
              </span>
            </div>
            {verification.notes && (
              <p className="text-sm text-muted-foreground mt-3 p-3 bg-muted rounded-lg">
                {verification.notes}
              </p>
            )}
            {verification.cycle && (
              <p className="text-xs text-muted-foreground mt-2">
                Cycle: {verification.cycle.name}
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
  const { verifications, isLoading, approveVerification, denyVerification } =
    useAgencyVerifications();

  const [selectedVerification, setSelectedVerification] =
    React.useState<PendingVerification | null>(null);
  const [actionType, setActionType] = React.useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const handleAction = (verification: PendingVerification, action: "approve" | "reject") => {
    setSelectedVerification(verification);
    setActionType(action);
    setActionError(null);
  };

  const confirmAction = async () => {
    if (!selectedVerification || !actionType) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      if (actionType === "approve") {
        await approveVerification(selectedVerification.id);
      } else {
        await denyVerification(selectedVerification.id, rejectionReason || undefined);
      }
      setSelectedVerification(null);
      setActionType(null);
      setRejectionReason("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelectedVerification(null);
    setActionType(null);
    setRejectionReason("");
    setActionError(null);
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
      <div className="grid gap-4 md:grid-cols-2">
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
            <div className="p-3 rounded-lg bg-muted text-muted-foreground">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">—</p>
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
              <p className="font-medium">{selectedVerification.skill?.name}</p>
              <p className="text-sm text-muted-foreground">
                {selectedVerification.employee
                  ? `${selectedVerification.employee.first_name} ${selectedVerification.employee.last_name}`
                  : "—"}
              </p>
            </div>

            {actionError && (
              <Alert variant="error" onClose={() => setActionError(null)}>
                {actionError}
              </Alert>
            )}

            {actionType === "approve" ? (
              <Alert variant="success">
                <CheckCircle className="h-4 w-4" />
                <span>
                  This will verify the employee&apos;s competency and record your approval.
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
