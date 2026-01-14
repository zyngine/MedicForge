"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface LTITool {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  tool_url: string;
  consumer_key: string;
  shared_secret: string;
  custom_params: Record<string, string>;
  is_active: boolean;
  launch_in_new_window: boolean;
  icon_url: string | null;
  lti_version: "1.1" | "1.3";
  // LTI 1.3 specific
  client_id: string | null;
  deployment_id: string | null;
  public_keyset_url: string | null;
  auth_login_url: string | null;
  auth_token_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LTIPlacement {
  id: string;
  tenant_id: string;
  tool_id: string;
  course_id: string | null;
  placement_type: "course_navigation" | "assignment" | "editor_button" | "resource_selection";
  position: number;
  is_visible: boolean;
  created_at: string;
  // Joined
  tool?: LTITool;
}

export interface LTILaunch {
  id: string;
  tenant_id: string;
  tool_id: string;
  user_id: string;
  course_id: string | null;
  assignment_id: string | null;
  launch_time: string;
  return_url: string | null;
  outcome_service_url: string | null;
  result_sourcedid: string | null;
  session_data: Record<string, unknown> | null;
  created_at: string;
}

export interface LTILaunchParams {
  lti_message_type: string;
  lti_version: string;
  resource_link_id: string;
  resource_link_title: string;
  user_id: string;
  roles: string;
  lis_person_name_given: string;
  lis_person_name_family: string;
  lis_person_name_full: string;
  lis_person_contact_email_primary: string;
  context_id: string;
  context_title: string;
  context_label: string;
  tool_consumer_instance_guid: string;
  tool_consumer_info_product_family_code: string;
  oauth_consumer_key: string;
  oauth_signature_method: string;
  oauth_timestamp: string;
  oauth_nonce: string;
  oauth_version: string;
  oauth_signature: string;
  [key: string]: string;
}

// Hook for managing LTI tools (admin)
export function useLTITools() {
  const [tools, setTools] = useState<LTITool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchTools = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("lti_tools")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("name");

      if (error) throw error;
      setTools(data || []);
    } catch (err) {
      console.error("Failed to fetch LTI tools:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  const createTool = async (input: {
    name: string;
    description?: string;
    tool_url: string;
    consumer_key: string;
    shared_secret: string;
    custom_params?: Record<string, string>;
    launch_in_new_window?: boolean;
    icon_url?: string;
    lti_version?: "1.1" | "1.3";
    // LTI 1.3 fields
    client_id?: string;
    deployment_id?: string;
    public_keyset_url?: string;
    auth_login_url?: string;
    auth_token_url?: string;
  }): Promise<LTITool | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("lti_tools")
        .insert({
          tenant_id: profile.tenant_id,
          name: input.name,
          description: input.description || null,
          tool_url: input.tool_url,
          consumer_key: input.consumer_key,
          shared_secret: input.shared_secret,
          custom_params: input.custom_params || {},
          launch_in_new_window: input.launch_in_new_window ?? false,
          icon_url: input.icon_url || null,
          lti_version: input.lti_version || "1.1",
          client_id: input.client_id || null,
          deployment_id: input.deployment_id || null,
          public_keyset_url: input.public_keyset_url || null,
          auth_login_url: input.auth_login_url || null,
          auth_token_url: input.auth_token_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      setTools((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("LTI tool created");
      return data;
    } catch (err) {
      toast.error("Failed to create LTI tool");
      return null;
    }
  };

  const updateTool = async (id: string, updates: Partial<LTITool>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("lti_tools")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setTools((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      toast.success("Tool updated");
      return true;
    } catch (err) {
      toast.error("Failed to update tool");
      return false;
    }
  };

  const deleteTool = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("lti_tools")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setTools((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tool deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete tool");
      return false;
    }
  };

  const toggleActive = async (id: string): Promise<boolean> => {
    const tool = tools.find((t) => t.id === id);
    if (!tool) return false;
    return updateTool(id, { is_active: !tool.is_active });
  };

  return {
    tools,
    activeTools: tools.filter((t) => t.is_active),
    isLoading,
    refetch: fetchTools,
    createTool,
    updateTool,
    deleteTool,
    toggleActive,
  };
}

// Hook for managing LTI placements
export function useLTIPlacements(courseId?: string) {
  const [placements, setPlacements] = useState<LTIPlacement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchPlacements = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("lti_placements")
        .select(`
          *,
          tool:lti_tools(*)
        `)
        .eq("tenant_id", profile.tenant_id)
        .eq("is_visible", true);

      if (courseId) {
        query = query.or(`course_id.eq.${courseId},course_id.is.null`);
      }

      const { data, error } = await query.order("position");
      if (error) throw error;
      setPlacements(data || []);
    } catch (err) {
      console.error("Failed to fetch placements:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchPlacements();
  }, [fetchPlacements]);

  const createPlacement = async (input: {
    tool_id: string;
    course_id?: string;
    placement_type: LTIPlacement["placement_type"];
    position?: number;
  }): Promise<LTIPlacement | null> => {
    if (!profile?.tenant_id) return null;

    try {
      const maxPosition = placements.length > 0
        ? Math.max(...placements.map((p) => p.position))
        : -1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("lti_placements")
        .insert({
          tenant_id: profile.tenant_id,
          tool_id: input.tool_id,
          course_id: input.course_id || null,
          placement_type: input.placement_type,
          position: input.position ?? maxPosition + 1,
        })
        .select(`
          *,
          tool:lti_tools(*)
        `)
        .single();

      if (error) throw error;
      setPlacements((prev) => [...prev, data].sort((a, b) => a.position - b.position));
      toast.success("Placement created");
      return data;
    } catch (err) {
      toast.error("Failed to create placement");
      return null;
    }
  };

  const deletePlacement = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("lti_placements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setPlacements((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err) {
      toast.error("Failed to delete placement");
      return false;
    }
  };

  const toggleVisibility = async (id: string): Promise<boolean> => {
    const placement = placements.find((p) => p.id === id);
    if (!placement) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("lti_placements")
        .update({ is_visible: !placement.is_visible })
        .eq("id", id);

      if (error) throw error;
      setPlacements((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_visible: !p.is_visible } : p))
      );
      return true;
    } catch (err) {
      return false;
    }
  };

  // Group by placement type
  const placementsByType = placements.reduce((acc, p) => {
    if (!acc[p.placement_type]) acc[p.placement_type] = [];
    acc[p.placement_type].push(p);
    return acc;
  }, {} as Record<string, LTIPlacement[]>);

  return {
    placements,
    placementsByType,
    navigationPlacements: placementsByType["course_navigation"] || [],
    assignmentPlacements: placementsByType["assignment"] || [],
    editorPlacements: placementsByType["editor_button"] || [],
    isLoading,
    refetch: fetchPlacements,
    createPlacement,
    deletePlacement,
    toggleVisibility,
  };
}

// Hook for LTI launch
export function useLTILaunch() {
  const [isLaunching, setIsLaunching] = useState(false);
  const { profile } = useUser();
  const supabase = createClient();

  // Generate OAuth signature for LTI 1.1
  const generateOAuthSignature = async (
    method: string,
    url: string,
    params: Record<string, string>,
    consumerSecret: string
  ): Promise<string> => {
    // Sort parameters
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join("&");

    // Create signature base string
    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(sortedParams),
    ].join("&");

    // Sign with HMAC-SHA1
    const signingKey = `${encodeURIComponent(consumerSecret)}&`;

    // Use Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(signingKey);
    const messageData = encoder.encode(signatureBaseString);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signatureArray = new Uint8Array(signature);
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray));

    return signatureBase64;
  };

  const launch = async (
    tool: LTITool,
    options?: {
      courseId?: string;
      assignmentId?: string;
      resourceLinkId?: string;
      returnUrl?: string;
    }
  ): Promise<{ launchUrl: string; params: LTILaunchParams } | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    setIsLaunching(true);

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomUUID();

      // Build launch parameters
      const params: Record<string, string> = {
        lti_message_type: "basic-lti-launch-request",
        lti_version: "LTI-1p0",
        resource_link_id: options?.resourceLinkId || tool.id,
        resource_link_title: tool.name,
        user_id: profile.id,
        roles: profile.role === "student" ? "Learner" : "Instructor",
        lis_person_name_given: profile.full_name?.split(" ")[0] || "",
        lis_person_name_family: profile.full_name?.split(" ").slice(1).join(" ") || "",
        lis_person_name_full: profile.full_name || "",
        lis_person_contact_email_primary: profile.email || "",
        context_id: options?.courseId || profile.tenant_id,
        context_title: "MedicForge Course",
        context_label: "MFCOURSE",
        tool_consumer_instance_guid: `medicforge.${profile.tenant_id}`,
        tool_consumer_info_product_family_code: "medicforge",
        oauth_consumer_key: tool.consumer_key,
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: timestamp,
        oauth_nonce: nonce,
        oauth_version: "1.0",
        ...tool.custom_params,
      };

      // Add outcome service URL if assignment
      if (options?.assignmentId) {
        params.lis_outcome_service_url = `${window.location.origin}/api/lti/outcomes`;
        params.lis_result_sourcedid = `${profile.tenant_id}:${options.assignmentId}:${profile.id}`;
      }

      // Generate signature
      const signature = await generateOAuthSignature(
        "POST",
        tool.tool_url,
        params,
        tool.shared_secret
      );

      params.oauth_signature = signature;

      // Record launch
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("lti_launches")
        .insert({
          tenant_id: profile.tenant_id,
          tool_id: tool.id,
          user_id: profile.id,
          course_id: options?.courseId || null,
          assignment_id: options?.assignmentId || null,
          return_url: options?.returnUrl || null,
          outcome_service_url: params.lis_outcome_service_url || null,
          result_sourcedid: params.lis_result_sourcedid || null,
          session_data: { launched_at: new Date().toISOString() },
        });

      return {
        launchUrl: tool.tool_url,
        params: params as LTILaunchParams,
      };
    } catch (err) {
      console.error("Failed to launch LTI tool:", err);
      toast.error("Failed to launch tool");
      return null;
    } finally {
      setIsLaunching(false);
    }
  };

  // Create and submit launch form
  const launchInFrame = async (
    tool: LTITool,
    containerId: string,
    options?: {
      courseId?: string;
      assignmentId?: string;
    }
  ): Promise<boolean> => {
    const launchData = await launch(tool, options);
    if (!launchData) return false;

    const container = document.getElementById(containerId);
    if (!container) return false;

    // Create iframe
    const iframe = document.createElement("iframe");
    iframe.name = `lti-frame-${tool.id}`;
    iframe.style.width = "100%";
    iframe.style.height = "600px";
    iframe.style.border = "none";

    // Create form targeting iframe
    const form = document.createElement("form");
    form.method = "POST";
    form.action = launchData.launchUrl;
    form.target = iframe.name;
    form.style.display = "none";

    // Add params as hidden inputs
    for (const [key, value] of Object.entries(launchData.params)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    // Clear container and add elements
    container.innerHTML = "";
    container.appendChild(iframe);
    document.body.appendChild(form);

    // Submit form
    form.submit();

    // Clean up form
    setTimeout(() => form.remove(), 100);

    return true;
  };

  // Launch in new window
  const launchInWindow = async (
    tool: LTITool,
    options?: {
      courseId?: string;
      assignmentId?: string;
    }
  ): Promise<boolean> => {
    const launchData = await launch(tool, {
      ...options,
      returnUrl: window.location.href,
    });
    if (!launchData) return false;

    // Create form
    const form = document.createElement("form");
    form.method = "POST";
    form.action = launchData.launchUrl;
    form.target = "_blank";
    form.style.display = "none";

    // Add params
    for (const [key, value] of Object.entries(launchData.params)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    form.remove();

    return true;
  };

  return {
    isLaunching,
    launch,
    launchInFrame,
    launchInWindow,
  };
}

// Hook for LTI grade passback (receiving grades from external tools)
export function useLTIGrades(assignmentId: string) {
  const [grades, setGrades] = useState<Array<{
    user_id: string;
    user_name: string;
    score: number;
    passed_back_at: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchGrades = async () => {
      if (!profile?.tenant_id || !assignmentId) return;

      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("lti_grades")
          .select(`
            *,
            launch:lti_launches(
              user:users(id, full_name)
            )
          `)
          .eq("tenant_id", profile.tenant_id)
          .not("score", "is", null)
          .order("passed_back_at", { ascending: false });

        if (error) throw error;

        const formattedGrades = (data || [])
          .filter((g: { launch: { assignment_id: string } }) => g.launch?.assignment_id === assignmentId)
          .map((g: { launch: { user: { id: string; full_name: string } }; score: number; passed_back_at: string }) => ({
            user_id: g.launch?.user?.id,
            user_name: g.launch?.user?.full_name || "Unknown",
            score: g.score * 100, // Convert from 0-1 to percentage
            passed_back_at: g.passed_back_at,
          }));

        setGrades(formattedGrades);
      } catch (err) {
        console.error("Failed to fetch LTI grades:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrades();
  }, [profile?.tenant_id, assignmentId, supabase]);

  return {
    grades,
    isLoading,
    hasGrades: grades.length > 0,
  };
}
