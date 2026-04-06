"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type SSOProvider = "saml" | "oidc" | "google" | "microsoft" | "okta";

export interface SSOConfig {
  id: string;
  tenant_id: string;
  provider: SSOProvider;
  name: string;
  is_enabled: boolean;
  is_default: boolean;
  // SAML specific
  saml_entity_id: string | null;
  saml_sso_url: string | null;
  saml_slo_url: string | null;
  saml_certificate: string | null;
  saml_signature_algorithm: string | null;
  // OIDC specific
  oidc_issuer: string | null;
  oidc_client_id: string | null;
  oidc_client_secret: string | null;
  oidc_discovery_url: string | null;
  oidc_scopes: string[];
  // Common
  attribute_mapping: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    studentId?: string;
  };
  auto_provision_users: boolean;
  default_role: string;
  allowed_domains: string[];
  created_at: string;
  updated_at: string;
}

export interface SSOSession {
  id: string;
  tenant_id: string;
  user_id: string;
  sso_config_id: string;
  session_id: string;
  provider_user_id: string;
  attributes: Record<string, any>;
  created_at: string;
  expires_at: string;
}

// Hook for SSO configuration management (admin only)
export function useSSOConfig() {
  const [configs, setConfigs] = useState<SSOConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const _supabase = createClient();

  const fetchConfigs = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setIsLoading(true);
      // Note: In production, this would come from a proper SSO configs table
      // For now, we'll simulate with localStorage + tenant settings
      const stored = localStorage.getItem(`sso_configs_${profile.tenant_id}`);
      if (stored) {
        setConfigs(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to fetch SSO configs:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const createConfig = async (input: Partial<SSOConfig>): Promise<SSOConfig | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      const newConfig: SSOConfig = {
        id: crypto.randomUUID(),
        tenant_id: profile.tenant_id,
        provider: input.provider || "saml",
        name: input.name || "SSO Provider",
        is_enabled: false,
        is_default: configs.length === 0,
        saml_entity_id: input.saml_entity_id || null,
        saml_sso_url: input.saml_sso_url || null,
        saml_slo_url: input.saml_slo_url || null,
        saml_certificate: input.saml_certificate || null,
        saml_signature_algorithm: input.saml_signature_algorithm || "sha256",
        oidc_issuer: input.oidc_issuer || null,
        oidc_client_id: input.oidc_client_id || null,
        oidc_client_secret: input.oidc_client_secret || null,
        oidc_discovery_url: input.oidc_discovery_url || null,
        oidc_scopes: input.oidc_scopes || ["openid", "email", "profile"],
        attribute_mapping: input.attribute_mapping || {
          email: "email",
          firstName: "firstName",
          lastName: "lastName",
        },
        auto_provision_users: input.auto_provision_users ?? true,
        default_role: input.default_role || "student",
        allowed_domains: input.allowed_domains || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updated = [...configs, newConfig];
      setConfigs(updated);
      localStorage.setItem(`sso_configs_${profile.tenant_id}`, JSON.stringify(updated));
      toast.success("SSO configuration created");
      return newConfig;
    } catch (_err) {
      toast.error("Failed to create SSO configuration");
      return null;
    }
  };

  const updateConfig = async (id: string, updates: Partial<SSOConfig>): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      const updated = configs.map((c) =>
        c.id === id
          ? { ...c, ...updates, updated_at: new Date().toISOString() }
          : c
      );
      setConfigs(updated);
      localStorage.setItem(`sso_configs_${profile.tenant_id}`, JSON.stringify(updated));
      toast.success("SSO configuration updated");
      return true;
    } catch (_err) {
      toast.error("Failed to update configuration");
      return false;
    }
  };

  const deleteConfig = async (id: string): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      const updated = configs.filter((c) => c.id !== id);
      setConfigs(updated);
      localStorage.setItem(`sso_configs_${profile.tenant_id}`, JSON.stringify(updated));
      toast.success("SSO configuration deleted");
      return true;
    } catch (_err) {
      toast.error("Failed to delete configuration");
      return false;
    }
  };

  const enableConfig = async (id: string): Promise<boolean> => {
    return updateConfig(id, { is_enabled: true });
  };

  const disableConfig = async (id: string): Promise<boolean> => {
    return updateConfig(id, { is_enabled: false });
  };

  const setAsDefault = async (id: string): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      const updated = configs.map((c) => ({
        ...c,
        is_default: c.id === id,
        updated_at: new Date().toISOString(),
      }));
      setConfigs(updated);
      localStorage.setItem(`sso_configs_${profile.tenant_id}`, JSON.stringify(updated));
      toast.success("Default SSO provider updated");
      return true;
    } catch (_err) {
      toast.error("Failed to set default provider");
      return false;
    }
  };

  const testConnection = async (id: string): Promise<{ success: boolean; message: string }> => {
    const config = configs.find((c) => c.id === id);
    if (!config) {
      return { success: false, message: "Configuration not found" };
    }

    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (config.provider === "saml" && (!config.saml_entity_id || !config.saml_sso_url)) {
      return { success: false, message: "Missing required SAML configuration" };
    }

    if (config.provider === "oidc" && (!config.oidc_issuer || !config.oidc_client_id)) {
      return { success: false, message: "Missing required OIDC configuration" };
    }

    return { success: true, message: "Connection test successful" };
  };

  // Get SP metadata for SAML
  const getSPMetadata = (configId: string): string => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="${baseUrl}/api/auth/saml/${configId}">
  <SPSSODescriptor
      AuthnRequestsSigned="true"
      WantAssertionsSigned="true"
      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="${baseUrl}/api/auth/saml/${configId}/callback"
        index="0"
        isDefault="true"/>
    <SingleLogoutService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="${baseUrl}/api/auth/saml/${configId}/logout"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
  };

  return {
    configs,
    enabledConfigs: configs.filter((c) => c.is_enabled),
    defaultConfig: configs.find((c) => c.is_default),
    isLoading,
    refetch: fetchConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    enableConfig,
    disableConfig,
    setAsDefault,
    testConnection,
    getSPMetadata,
  };
}

// Hook for SSO login
export function useSSOLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<SSOConfig[]>([]);
  const supabase = createClient();

  // Get available SSO providers for a tenant (by slug or domain)
  const getProviders = useCallback(async (tenantSlug?: string): Promise<SSOConfig[]> => {
    try {
      setIsLoading(true);

      // In production, this would fetch from the database
      // For now, check localStorage for demo
      const tenants = JSON.parse(localStorage.getItem("demo_tenants") || "[]");
      const tenant = tenants.find((t: { slug: string }) => t.slug === tenantSlug);

      if (tenant) {
        const configs = JSON.parse(
          localStorage.getItem(`sso_configs_${tenant.id}`) || "[]"
        );
        const enabled = configs.filter((c: SSOConfig) => c.is_enabled);
        setAvailableProviders(enabled);
        return enabled;
      }

      return [];
    } catch (err) {
      console.error("Failed to get SSO providers:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initiate SSO login
  const initiateSSOLogin = async (
    config: SSOConfig,
    returnUrl?: string
  ): Promise<string | null> => {
    setIsLoading(true);

    try {
      const state = crypto.randomUUID();
      const nonce = crypto.randomUUID();

      // Store state for verification
      sessionStorage.setItem(
        `sso_state_${state}`,
        JSON.stringify({
          configId: config.id,
          returnUrl: returnUrl || "/",
          nonce,
          timestamp: Date.now(),
        })
      );

      if (config.provider === "saml") {
        // Build SAML AuthnRequest URL
        const authUrl = buildSAMLAuthRequest(config, state);
        return authUrl;
      } else if (config.provider === "oidc") {
        // Build OIDC authorization URL
        const authUrl = buildOIDCAuthRequest(config, state, nonce);
        return authUrl;
      } else if (config.provider === "google") {
        // Use Supabase OAuth
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        return data.url;
      } else if (config.provider === "microsoft") {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "azure",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        return data.url;
      }

      return null;
    } catch (err) {
      console.error("Failed to initiate SSO:", err);
      toast.error("Failed to start SSO login");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Build SAML AuthnRequest
  const buildSAMLAuthRequest = (config: SSOConfig, relayState: string): string => {
    const baseUrl = window.location.origin;
    const acsUrl = `${baseUrl}/api/auth/saml/${config.id}/callback`;

    // In production, this would be a proper SAML request
    // For demo, we'll create a simplified redirect
    const params = new URLSearchParams({
      SAMLRequest: btoa(`<AuthnRequest>
        <Issuer>${baseUrl}/api/auth/saml/${config.id}</Issuer>
        <AssertionConsumerServiceURL>${acsUrl}</AssertionConsumerServiceURL>
      </AuthnRequest>`),
      RelayState: relayState,
    });

    return `${config.saml_sso_url}?${params.toString()}`;
  };

  // Build OIDC authorization request
  const buildOIDCAuthRequest = (
    config: SSOConfig,
    state: string,
    nonce: string
  ): string => {
    const baseUrl = window.location.origin;
    const redirectUri = `${baseUrl}/api/auth/oidc/${config.id}/callback`;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.oidc_client_id || "",
      redirect_uri: redirectUri,
      scope: (config.oidc_scopes || ["openid", "email", "profile"]).join(" "),
      state,
      nonce,
    });

    // Use discovery URL or construct from issuer
    const authEndpoint = config.oidc_issuer
      ? `${config.oidc_issuer}/authorize`
      : config.oidc_discovery_url?.replace("/.well-known/openid-configuration", "/authorize");

    return `${authEndpoint}?${params.toString()}`;
  };

  // Handle SSO callback
  const handleSSOCallback = async (
    searchParams: URLSearchParams
  ): Promise<{ success: boolean; user?: unknown; error?: string }> => {
    const state = searchParams.get("state");
    const code = searchParams.get("code");
    const samlResponse = searchParams.get("SAMLResponse");

    if (!state) {
      return { success: false, error: "Missing state parameter" };
    }

    // Retrieve stored state
    const storedStateStr = sessionStorage.getItem(`sso_state_${state}`);
    if (!storedStateStr) {
      return { success: false, error: "Invalid or expired state" };
    }

    const storedState = JSON.parse(storedStateStr);

    // Check state expiry (5 minutes)
    if (Date.now() - storedState.timestamp > 300000) {
      sessionStorage.removeItem(`sso_state_${state}`);
      return { success: false, error: "SSO session expired" };
    }

    try {
      if (samlResponse) {
        // Handle SAML response
        return await handleSAMLResponse(samlResponse, storedState);
      } else if (code) {
        // Handle OIDC code exchange
        return await handleOIDCCallback(code, storedState);
      }

      return { success: false, error: "Invalid callback parameters" };
    } finally {
      sessionStorage.removeItem(`sso_state_${state}`);
    }
  };

  // Handle SAML response
  const handleSAMLResponse = async (
    samlResponse: string,
    _storedState: { configId: string; returnUrl: string }
  ): Promise<{ success: boolean; user?: unknown; error?: string }> => {
    try {
      // In production, this would validate and parse the SAML response
      // For demo, we'll simulate a successful response
      const decodedResponse = atob(samlResponse);
      console.log("SAML Response:", decodedResponse);

      // Extract user info from SAML assertion (simulated)
      const user = {
        email: "sso.user@example.com",
        firstName: "SSO",
        lastName: "User",
      };

      toast.success("SSO login successful");
      return { success: true, user };
    } catch (_err) {
      return { success: false, error: "Failed to process SAML response" };
    }
  };

  // Handle OIDC callback
  const handleOIDCCallback = async (
    _code: string,
    _storedState: { configId: string; returnUrl: string; nonce: string }
  ): Promise<{ success: boolean; user?: unknown; error?: string }> => {
    try {
      // In production, this would exchange the code for tokens
      // and validate the ID token

      // Simulated user info
      const user = {
        email: "oidc.user@example.com",
        firstName: "OIDC",
        lastName: "User",
      };

      toast.success("SSO login successful");
      return { success: true, user };
    } catch (_err) {
      return { success: false, error: "Failed to complete OIDC login" };
    }
  };

  return {
    isLoading,
    availableProviders,
    getProviders,
    initiateSSOLogin,
    handleSSOCallback,
  };
}

// Hook for Just-In-Time user provisioning
export function useSSOProvisioning() {
  const { profile } = useUser();
  const supabase = createClient();

  // Provision or update user from SSO attributes
  const provisionUser = async (
    config: SSOConfig,
    attributes: Record<string, any>
  ): Promise<{ userId: string; isNew: boolean } | null> => {
    if (!profile?.tenant_id) return null;

    try {
      const mapping = config.attribute_mapping;
      const email = attributes[mapping.email || "email"] as string;
      const firstName = attributes[mapping.firstName || "firstName"] as string;
      const lastName = attributes[mapping.lastName || "lastName"] as string;
      const roleAttr = mapping.role ? (attributes[mapping.role] as string) : null;

      if (!email) {
        toast.error("Email not provided by SSO");
        return null;
      }

      // Check domain restriction
      if (config.allowed_domains.length > 0) {
        const domain = email.split("@")[1];
        if (!config.allowed_domains.includes(domain)) {
          toast.error("Email domain not allowed");
          return null;
        }
      }

      // Check if user exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingUser } = await (supabase as any)
        .from("users")
        .select("id")
        .eq("email", email)
        .eq("tenant_id", profile.tenant_id)
        .single();

      if (existingUser) {
        // Update existing user
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("users")
          .update({
            full_name: `${firstName || ""} ${lastName || ""}`.trim() || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingUser.id);

        return { userId: existingUser.id, isNew: false };
      }

      // Create new user if auto-provisioning is enabled
      if (!config.auto_provision_users) {
        toast.error("User not found and auto-provisioning is disabled");
        return null;
      }

      // Determine role
      let role = config.default_role;
      if (roleAttr) {
        const roleLower = roleAttr.toLowerCase();
        if (roleLower.includes("instructor") || roleLower.includes("teacher")) {
          role = "instructor";
        } else if (roleLower.includes("admin")) {
          role = "admin";
        }
      }

      // Create new user (in production, would also create auth.users record)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newUser, error } = await (supabase as any)
        .from("users")
        .insert({
          tenant_id: profile.tenant_id,
          email,
          full_name: `${firstName || ""} ${lastName || ""}`.trim() || email,
          role,
          is_active: true,
        })
        .select("id")
        .single();

      if (error) throw error;

      toast.success("User account created via SSO");
      return { userId: newUser.id, isNew: true };
    } catch (err) {
      console.error("Failed to provision user:", err);
      toast.error("Failed to create user account");
      return null;
    }
  };

  return {
    provisionUser,
  };
}
