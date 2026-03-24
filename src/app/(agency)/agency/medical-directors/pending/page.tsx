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
  Checkbox,
  Select,
  Textarea,
} from "@/components/ui";
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Award,
  ListChecks,
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";
import { useAgencyVerifications } from "@/lib/hooks/use-agency-data";
import { useBatchVerify } from "@/lib/hooks/use-batch-verify";
import type { PendingVerification } from "@/lib/hooks/use-agency-data";

const VERIFICATION_METHOD_OPTIONS = [
  { value: "in_person", label: "In Person" },
  { value: "video", label: "Video" },
  { value: "documentation_review", label: "Documentation Review" },
];

function VerificationCard({
  verification,
  isSelected,
  onToggleSelect,
  onApprove,
  onReject,
}: {
  verification: PendingVerification;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card className={isSelected ? "ring-2 ring-primary" : ""}>
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onChange={() => onToggleSelect(verification.id)}
            aria-label={`Select ${verification.skill?.name ?? "verification"}`}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{verification.skill?.name ?? "—"}</h3>
              <Badge variant="outline">{verification.employee?.certification_level}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
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
  const { verifications, isLoading, approveVerification, denyVerification, refetch } =
    useAgencyVerifications();
  const batchVerify = useBatchVerify();

  // ── Single-action state ───────────────────────────────────────────────────
  const [selectedVerification, setSelectedVerification] =
    React.useState<PendingVerification | null>(null);
  const [actionType, setActionType] = React.useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // ── Batch-approve state ───────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = React.useState(false);
  const [batchMethod, setBatchMethod] = React.useState("in_person");
  const [batchNotes, setBatchNotes] = React.useState("");
  const [batchError, setBatchError] = React.useState<string | null>(null);

  // ── Single-action handlers ────────────────────────────────────────────────
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

  // ── Batch-approve handlers ────────────────────────────────────────────────
  const allIds = verifications.map((v) => v.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openBatchModal = () => {
    setBatchMethod("in_person");
    setBatchNotes("");
    setBatchError(null);
    setBatchModalOpen(true);
  };

  const closeBatchModal = () => {
    setBatchModalOpen(false);
    setBatchError(null);
  };

  const confirmBatchApprove = async () => {
    setBatchError(null);
    try {
      await batchVerify.mutateAsync({
        competency_ids: [...selectedIds],
        verification_method: batchMethod,
        notes: batchNotes || undefined,
      });
      setSelectedIds(new Set());
      setBatchModalOpen(false);
      await refetch();
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Batch approval failed");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
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
        <div className="flex items-center gap-3 flex-wrap">
          {selectedIds.size > 0 && (
            <Button onClick={openBatchModal}>
              <ListChecks className="h-4 w-4 mr-2" />
              Approve Selected ({selectedIds.size})
            </Button>
          )}
          <Badge variant="outline" className="w-fit">
            {verifications.length} pending
          </Badge>
        </div>
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
        <>
          {/* Select All Row */}
          <div className="flex items-center gap-3 px-1">
            <Checkbox
              checked={allSelected}
              onChange={toggleSelectAll}
              label={someSelected && !allSelected ? "Deselect All" : "Select All"}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {verifications.map((verification) => (
              <VerificationCard
                key={verification.id}
                verification={verification}
                isSelected={selectedIds.has(verification.id)}
                onToggleSelect={toggleSelectOne}
                onApprove={() => handleAction(verification, "approve")}
                onReject={() => handleAction(verification, "reject")}
              />
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success opacity-50" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">No pending verifications to review</p>
          </CardContent>
        </Card>
      )}

      {/* Single-Action Confirmation Modal */}
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

      {/* Batch Approve Modal */}
      <Modal
        isOpen={batchModalOpen}
        onClose={closeBatchModal}
        title={`Approve Selected (${selectedIds.size})`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You are about to approve{" "}
            <span className="font-semibold text-foreground">{selectedIds.size}</span>{" "}
            verification{selectedIds.size === 1 ? "" : "s"}. Choose a verification method and
            optionally add notes.
          </p>

          {batchError && (
            <Alert variant="error" onClose={() => setBatchError(null)}>
              {batchError}
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="batchMethod">Verification Method</Label>
            <Select
              id="batchMethod"
              options={VERIFICATION_METHOD_OPTIONS}
              value={batchMethod}
              onChange={(val) => setBatchMethod(val)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batchNotes">Notes (optional)</Label>
            <Textarea
              id="batchNotes"
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              placeholder="Add any notes for these approvals..."
              rows={3}
            />
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={closeBatchModal}>
              Cancel
            </Button>
            <Button
              onClick={confirmBatchApprove}
              disabled={batchVerify.isPending}
            >
              {batchVerify.isPending ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirm Approval
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
