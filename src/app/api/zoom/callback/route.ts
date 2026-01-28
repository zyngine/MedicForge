// Zoom OAuth Callback - Exchange code for tokens
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForToken, getZoomUser } from "@/lib/zoom";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Get the stored state from cookie
  const storedState = request.cookies.get("zoom_oauth_state")?.value;

  // Build redirect URL based on result
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const successUrl = `${baseUrl}/instructor/settings?zoom=connected`;
  const errorUrl = `${baseUrl}/instructor/settings?zoom=error`;

  // Handle OAuth errors
  if (error) {
    console.error("[Zoom Callback] OAuth error:", error);
    return NextResponse.redirect(`${errorUrl}&message=${encodeURIComponent(error)}`);
  }

  // Verify state to prevent CSRF
  if (!state || state !== storedState) {
    console.error("[Zoom Callback] State mismatch");
    return NextResponse.redirect(`${errorUrl}&message=invalid_state`);
  }

  if (!code) {
    console.error("[Zoom Callback] No code provided");
    return NextResponse.redirect(`${errorUrl}&message=no_code`);
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${errorUrl}&message=not_authenticated`);
    }

    // Get user's tenant_id
    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.redirect(`${errorUrl}&message=no_profile`);
    }

    // Exchange code for tokens
    const tokenData = await exchangeCodeForToken(code);

    // Get Zoom user info
    const zoomUser = await getZoomUser(tokenData.access_token);

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // Store/update the connection
    const { error: upsertError } = await (supabase as any)
      .from("zoom_connections")
      .upsert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        zoom_user_id: zoomUser.id,
        zoom_email: zoomUser.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        scopes: tokenData.scope.split(" "),
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "tenant_id,user_id",
      });

    if (upsertError) {
      console.error("[Zoom Callback] Database error:", upsertError);
      return NextResponse.redirect(`${errorUrl}&message=database_error`);
    }

    // Clear the state cookie and redirect to success
    const response = NextResponse.redirect(successUrl);
    response.cookies.delete("zoom_oauth_state");
    return response;

  } catch (err) {
    console.error("[Zoom Callback] Error:", err);
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.redirect(`${errorUrl}&message=${encodeURIComponent(message)}`);
  }
}
