import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface APIContext {
  tenantId: string;
  apiKeyId: string;
  scopes: string[];
}

/**
 * Validates API key from Authorization header
 * Header format: Authorization: Bearer <api_key>
 */
export async function validateAPIKey(request: NextRequest): Promise<APIContext | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix

  if (!apiKey || apiKey.length < 32) {
    return null;
  }

  const supabase = await createClient();

  // Look up the API key in the database
  // Using type assertion since api_keys table is newly added
  const { data: keyData, error } = await (supabase as any)
    .from("api_keys")
    .select("id, tenant_id, scopes, is_active, expires_at")
    .eq("key_hash", hashAPIKey(apiKey))
    .single();

  if (error || !keyData) {
    return null;
  }

  // Check if key is active
  if (!keyData.is_active) {
    return null;
  }

  // Check if key has expired
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at
  await (supabase as any)
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyData.id);

  return {
    tenantId: keyData.tenant_id,
    apiKeyId: keyData.id,
    scopes: keyData.scopes || ["read"],
  };
}

/**
 * Hash API key for storage comparison
 * In production, use a proper hashing algorithm like SHA-256
 */
function hashAPIKey(key: string): string {
  // Simple hash for demo - in production use crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

/**
 * Generate a new API key
 */
export function generateAPIKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "mf_"; // MedicForge prefix
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Get hash for storing API key
 */
export function getAPIKeyHash(key: string): string {
  return hashAPIKey(key);
}

/**
 * Middleware wrapper for API routes that require authentication
 */
export function withAPIAuth(
  handler: (request: NextRequest, context: APIContext) => Promise<NextResponse>,
  requiredScopes: string[] = []
) {
  return async (request: NextRequest) => {
    const apiContext = await validateAPIKey(request);

    if (!apiContext) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    // Check scopes
    if (requiredScopes.length > 0) {
      const hasScope = requiredScopes.some(scope =>
        apiContext.scopes.includes(scope) || apiContext.scopes.includes("admin")
      );

      if (!hasScope) {
        return NextResponse.json(
          { error: "Forbidden", message: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    return handler(request, apiContext);
  };
}

/**
 * Standard API error response
 */
export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standard API success response
 */
export function apiSuccess<T>(data: T, meta?: { page?: number; limit?: number; total?: number }) {
  return NextResponse.json({
    data,
    meta: meta || undefined,
  });
}

/**
 * Parse pagination params from request
 */
export function getPagination(request: NextRequest): { page: number; limit: number; offset: number } {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
