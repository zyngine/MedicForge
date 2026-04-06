"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Badge,
  Spinner,
  Modal,
  ModalFooter,
  Alert,
} from "@/components/ui";
import {
  Stethoscope,
  Plus,
  Mail,
  Copy,
  Trash2,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";
import { useMDInvitations } from "@/lib/hooks/use-md-invitations";
import { toast } from "sonner";

export default function MedicalDirectorsPage() {
  const { isAgencyAdmin } = useAgencyRole();
  const {
    pendingInvitations,
    acceptedInvitations,
    expiredInvitations,
    isLoading,
    createInvitation,
    deleteInvitation,
    resendInvitation,
  } = useMDInvitations();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    email: "",
    mdName: "",
    mdCredentials: "",
    mdLicenseNumber: "",
    isPrimary: false,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await createInvitation(formData);

    if (result) {
      setInviteUrl(result.registrationUrl);
      setFormData({
        email: "",
        mdName: "",
        mdCredentials: "",
        mdLicenseNumber: "",
        isPrimary: false,
      });
    }

    setIsSubmitting(false);
  };

  const copyInviteUrl = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      toast.success("Copied", {
        description: "Invitation link copied to clipboard",
      });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setInviteUrl(null);
    setFormData({
      email: "",
      mdName: "",
      mdCredentials: "",
      mdLicenseNumber: "",
      isPrimary: false,
    });
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
          <h1 className="text-2xl font-bold">Medical Directors</h1>
          <p className="text-muted-foreground">
            Manage Medical Director accounts and invitations
          </p>
        </div>
        {isAgencyAdmin && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite Medical Director
          </Button>
        )}
      </div>

      {/* Active Medical Directors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Active Medical Directors
          </CardTitle>
          <CardDescription>
            Medical Directors with active accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {acceptedInvitations.length > 0 ? (
            <div className="space-y-4">
              {acceptedInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{inv.md_name}</p>
                      {inv.is_primary && (
                        <Badge variant="outline" className="text-primary">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{inv.email}</p>
                    {inv.md_credentials && (
                      <p className="text-sm text-muted-foreground">
                        {inv.md_credentials}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-success">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active Medical Directors</p>
              {isAgencyAdmin && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsModalOpen(true)}
                >
                  Invite Your First MD
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{inv.md_name}</p>
                    <p className="text-sm text-muted-foreground">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires: {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resendInvitation(inv)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteInvitation(inv.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expired Invitations */}
      {expiredInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              Expired Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expiredInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-4 border rounded-lg opacity-60"
                >
                  <div>
                    <p className="font-medium">{inv.md_name}</p>
                    <p className="text-sm text-muted-foreground">{inv.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resendInvitation(inv)}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteInvitation(inv.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={inviteUrl ? "Invitation Created" : "Invite Medical Director"}
      >
        {inviteUrl ? (
          <div className="space-y-4">
            <Alert variant="success">
              <CheckCircle className="h-4 w-4" />
              <span>Invitation created successfully!</span>
            </Alert>
            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" onClick={copyInviteUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Share this link with the Medical Director. They will use it to create their account.
              </p>
            </div>
            <ModalFooter>
              <Button onClick={closeModal}>Done</Button>
            </ModalFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mdName" required>
                Full Name
              </Label>
              <Input
                id="mdName"
                value={formData.mdName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, mdName: e.target.value }))
                }
                placeholder="Dr. John Smith"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" required>
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="doctor@hospital.com"
                leftIcon={<Mail className="h-4 w-4" />}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mdCredentials">
                Credentials
              </Label>
              <Input
                id="mdCredentials"
                value={formData.mdCredentials}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, mdCredentials: e.target.value }))
                }
                placeholder="MD, DO, FACEP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mdLicenseNumber">
                License Number
              </Label>
              <Input
                id="mdLicenseNumber"
                value={formData.mdLicenseNumber}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, mdLicenseNumber: e.target.value }))
                }
                placeholder="PA-MD-123456"
              />
            </div>

            <ModalFooter>
              <Button variant="outline" type="button" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </div>
  );
}
