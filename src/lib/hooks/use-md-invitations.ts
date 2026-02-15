"use client";

import * as React from "react";
import { toast } from "sonner";

interface MDInvitation {
  id: string;
  email: string;
  md_name: string;
  md_credentials: string | null;
  md_license_number: string | null;
  invite_code: string;
  expires_at: string;
  accepted_at: string | null;
  is_primary: boolean;
  created_at: string;
}

interface CreateInvitationParams {
  email: string;
  mdName: string;
  mdCredentials?: string;
  mdLicenseNumber?: string;
  isPrimary?: boolean;
}

interface InvitationResponse {
  id: string;
  email: string;
  mdName: string;
  inviteCode: string;
  expiresAt: string;
  registrationUrl: string;
  tenantName: string;
}

export function useMDInvitations() {
  const [invitations, setInvitations] = React.useState<MDInvitation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchInvitations = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/agency/invite-md");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch invitations");
      }

      setInvitations(data.invitations || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch invitations";
      setError(message);
      console.error("Error fetching MD invitations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const createInvitation = async (
    params: CreateInvitationParams
  ): Promise<InvitationResponse | null> => {
    try {
      const response = await fetch("/api/agency/invite-md", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create invitation");
      }

      toast.success("Invitation Sent", {
        description: `Invitation created for ${params.mdName}`,
      });

      // Refresh the list
      await fetchInvitations();

      return data.invitation;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create invitation";
      toast.error("Error", {
        description: message,
      });
      return null;
    }
  };

  const deleteInvitation = async (invitationId: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/agency/invite-md", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete invitation");
      }

      toast.success("Invitation Deleted", {
        description: "The invitation has been revoked",
      });

      // Refresh the list
      await fetchInvitations();

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete invitation";
      toast.error("Error", {
        description: message,
      });
      return false;
    }
  };

  const resendInvitation = async (invitation: MDInvitation): Promise<InvitationResponse | null> => {
    // Delete the old invitation and create a new one
    await deleteInvitation(invitation.id);
    return createInvitation({
      email: invitation.email,
      mdName: invitation.md_name,
      mdCredentials: invitation.md_credentials || undefined,
      mdLicenseNumber: invitation.md_license_number || undefined,
      isPrimary: invitation.is_primary,
    });
  };

  // Get active (pending) invitations
  const pendingInvitations = React.useMemo(() => {
    return invitations.filter(
      (inv) => !inv.accepted_at && new Date(inv.expires_at) > new Date()
    );
  }, [invitations]);

  // Get expired invitations
  const expiredInvitations = React.useMemo(() => {
    return invitations.filter(
      (inv) => !inv.accepted_at && new Date(inv.expires_at) <= new Date()
    );
  }, [invitations]);

  // Get accepted invitations
  const acceptedInvitations = React.useMemo(() => {
    return invitations.filter((inv) => inv.accepted_at);
  }, [invitations]);

  return {
    invitations,
    pendingInvitations,
    expiredInvitations,
    acceptedInvitations,
    isLoading,
    error,
    createInvitation,
    deleteInvitation,
    resendInvitation,
    refetch: fetchInvitations,
  };
}
