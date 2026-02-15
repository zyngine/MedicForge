"use client";

import { useUser } from "./use-user";
import { useTenant } from "./use-tenant";

export type AgencyRole = "agency_admin" | "medical_director" | null;

export function useAgencyRole() {
  const { profile, isLoading: userLoading } = useUser();
  const { tenant, isLoading: tenantLoading } = useTenant();

  const agencyRole = (profile?.agency_role as AgencyRole) || null;
  const isAgencyTenant = tenant?.tenant_type === "agency";
  const isAgencyAdmin = agencyRole === "agency_admin";
  const isMedicalDirector = agencyRole === "medical_director";
  const hasAgencyAccess = isAgencyTenant && (isAgencyAdmin || isMedicalDirector);

  return {
    agencyRole,
    isAgencyTenant,
    isAgencyAdmin,
    isMedicalDirector,
    hasAgencyAccess,
    isLoading: userLoading || tenantLoading,
    tenantType: tenant?.tenant_type || "education",
  };
}

// Hook for checking specific permissions
export function useAgencyPermissions() {
  const { isAgencyAdmin, isMedicalDirector, isAgencyTenant } = useAgencyRole();

  return {
    // Dashboard access
    canViewDashboard: isAgencyTenant && (isAgencyAdmin || isMedicalDirector),

    // Employee management
    canManageEmployees: isAgencyAdmin,
    canViewEmployees: isAgencyAdmin || isMedicalDirector,

    // Skills library
    canManageSkills: isAgencyAdmin,
    canViewSkills: isAgencyAdmin || isMedicalDirector,

    // Verification cycles
    canManageCycles: isAgencyAdmin,
    canViewCycles: isAgencyAdmin || isMedicalDirector,

    // Medical director management
    canManageMDs: isAgencyAdmin,
    canInviteMDs: isAgencyAdmin,

    // Competency verification (MD sign-off)
    canVerifyCompetencies: isMedicalDirector,
    canViewPendingVerifications: isMedicalDirector,

    // Audit log
    canViewAuditLog: isAgencyAdmin,

    // Settings
    canManageSettings: isAgencyAdmin,
  };
}
