"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
  Alert,
  Input,
} from "@/components/ui";
import {
  useMedicalDirectors,
  useAssignMedicalDirector,
  useRevokeMdAssignment,
  useUpdateMdAssignment,
  useMdStats,
  MedicalDirectorAssignment,
} from "@/lib/hooks/use-medical-directors";
import {
  Plus,
  UserCog,
  Mail,
  Phone,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  X,
  Star,
  FileText,
} from "lucide-react";

export default function MedicalDirectorsPage() {
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [editingMd, setEditingMd] = React.useState<MedicalDirectorAssignment | null>(null);
  const [selectedMdId, setSelectedMdId] = React.useState<string | null>(null);

  const { data: medicalDirectors, isLoading, error } = useMedicalDirectors();
  const revokeMd = useRevokeMdAssignment();

  const activeMDs = medicalDirectors?.filter((md) => md.is_active) || [];
  const inactiveMDs = medicalDirectors?.filter((md) => !md.is_active) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Medical Directors</h1>
          <p className="text-muted-foreground">
            Manage medical director oversight and verification authority
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Assign Medical Director
        </Button>
      </div>

      {error && (
        <Alert variant="error">Failed to load medical directors.</Alert>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{activeMDs.length}</div>
                <p className="text-sm text-muted-foreground">Active MDs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {activeMDs.filter((md) => md.is_primary).length}
                </div>
                <p className="text-sm text-muted-foreground">Primary MD</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {inactiveMDs.length}
                </div>
                <p className="text-sm text-muted-foreground">Inactive MDs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Medical Directors */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Active Medical Directors</h2>
        {activeMDs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserCog className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No medical directors assigned</h3>
              <p className="text-muted-foreground text-center mb-4">
                Assign a medical director to enable competency verification
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                Assign First Medical Director
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {activeMDs.map((md) => (
              <MdCard
                key={md.id}
                md={md}
                isExpanded={selectedMdId === md.id}
                onToggle={() => setSelectedMdId(selectedMdId === md.id ? null : md.id)}
                onEdit={() => setEditingMd(md)}
                onRevoke={() => {
                  if (confirm("Are you sure you want to revoke this medical director's access?")) {
                    revokeMd.mutate(md.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Medical Directors */}
      {inactiveMDs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Inactive Medical Directors
          </h2>
          <div className="grid gap-4 opacity-60">
            {inactiveMDs.map((md) => (
              <MdCard
                key={md.id}
                md={md}
                isExpanded={false}
                onToggle={() => {}}
                onEdit={() => setEditingMd(md)}
                onRevoke={() => {}}
                isInactive
              />
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingMd) && (
        <MdModal
          md={editingMd}
          onClose={() => {
            setShowAddModal(false);
            setEditingMd(null);
          }}
        />
      )}
    </div>
  );
}

function MdCard({
  md,
  isExpanded,
  onToggle,
  onEdit,
  onRevoke,
  isInactive = false,
}: {
  md: MedicalDirectorAssignment;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRevoke: () => void;
  isInactive?: boolean;
}) {
  const { data: stats, isLoading: loadingStats } = useMdStats(isExpanded ? md.id : null);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1 cursor-pointer" onClick={onToggle}>
            {/* Avatar */}
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCog className="h-6 w-6 text-primary" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{md.md_name}</h3>
                {md.is_primary && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    Primary
                  </Badge>
                )}
                {md.md_credentials && (
                  <Badge variant="outline">{md.md_credentials}</Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                {md.md_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {md.md_email}
                  </span>
                )}
                {md.md_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {md.md_phone}
                  </span>
                )}
                {md.md_license_number && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    License: {md.md_license_number}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Assigned {new Date(md.assigned_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isInactive && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={onRevoke}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Expanded Stats */}
        {isExpanded && !isInactive && (
          <div className="mt-4 pt-4 border-t">
            {loadingStats ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalVerifications}</div>
                  <div className="text-sm text-muted-foreground">Total Verifications</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.last30Days}</div>
                  <div className="text-sm text-muted-foreground">Last 30 Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.pendingCount}</div>
                  <div className="text-sm text-muted-foreground">Pending Review</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.approvalRate}%</div>
                  <div className="text-sm text-muted-foreground">Approval Rate</div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No verification activity yet</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MdModal({
  md,
  onClose,
}: {
  md: MedicalDirectorAssignment | null;
  onClose: () => void;
}) {
  const [userId, setUserId] = React.useState(md?.user_id || "");
  const [mdName, setMdName] = React.useState(md?.md_name || "");
  const [mdCredentials, setMdCredentials] = React.useState(md?.md_credentials || "");
  const [mdLicenseNumber, setMdLicenseNumber] = React.useState(md?.md_license_number || "");
  const [mdEmail, setMdEmail] = React.useState(md?.md_email || "");
  const [mdPhone, setMdPhone] = React.useState(md?.md_phone || "");
  const [isPrimary, setIsPrimary] = React.useState(md?.is_primary || false);

  const assignMd = useAssignMedicalDirector();
  const updateMd = useUpdateMdAssignment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!userId || !mdName) && !md) return;

    if (md) {
      await updateMd.mutateAsync({
        assignmentId: md.id,
        updates: {
          md_name: mdName,
          md_credentials: mdCredentials || undefined,
          md_license_number: mdLicenseNumber || undefined,
          md_email: mdEmail || undefined,
          md_phone: mdPhone || undefined,
          is_primary: isPrimary,
        },
      });
    } else {
      await assignMd.mutateAsync({
        user_id: userId,
        md_name: mdName,
        md_credentials: mdCredentials || undefined,
        md_license_number: mdLicenseNumber || undefined,
        md_email: mdEmail || undefined,
        md_phone: mdPhone || undefined,
        is_primary: isPrimary,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {md ? "Edit Medical Director" : "Assign Medical Director"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!md && (
              <div>
                <label className="text-sm font-medium">User ID *</label>
                <Input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user UUID"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The user must already have an account in the system
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={mdName}
                onChange={(e) => setMdName(e.target.value)}
                placeholder="Dr. John Smith"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Credentials</label>
              <Input
                value={mdCredentials}
                onChange={(e) => setMdCredentials(e.target.value)}
                placeholder="MD, FACEP"
              />
            </div>

            <div>
              <label className="text-sm font-medium">License Number</label>
              <Input
                value={mdLicenseNumber}
                onChange={(e) => setMdLicenseNumber(e.target.value)}
                placeholder="PA-12345"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={mdEmail}
                  onChange={(e) => setMdEmail(e.target.value)}
                  placeholder="doctor@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  type="tel"
                  value={mdPhone}
                  onChange={(e) => setMdPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">Primary Medical Director</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                The primary MD is the main contact for the agency
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  assignMd.isPending ||
                  updateMd.isPending ||
                  (!md && (!userId || !mdName))
                }
              >
                {assignMd.isPending || updateMd.isPending
                  ? "Saving..."
                  : md
                  ? "Update"
                  : "Assign"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
