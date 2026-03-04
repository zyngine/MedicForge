import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  console.log("[Auth Callback] Received callback:", {
    hasCode: !!code,
    next,
    error,
    errorDescription
  });

  // Handle error from Supabase
  if (error) {
    console.error("[Auth Callback] Error from Supabase:", error, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[Auth Callback] Error exchanging code:", exchangeError);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    if (data.session && data.user) {
      console.log("[Auth Callback] Session created for user:", data.user.id);
      console.log("[Auth Callback] User metadata:", data.user.user_metadata);

      // Invite flow: skip setup-user entirely — the profile was already created
      // by invite-user/route.ts when the admin sent the invite. setup-user would
      // fail (400) for invite users because their metadata has no registration_type.
      const type = searchParams.get("type");
      if (type === "invite") {
        console.log("[Auth Callback] Invite detected, redirecting to set-password");
        return NextResponse.redirect(`${origin}/set-password`);
      }

      // Non-invite flow: call setup-user to create the profile for new sign-ups
      try {
        const setupResponse = await fetch(`${origin}/api/auth/setup-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            email: data.user.email,
            metadata: data.user.user_metadata,
          }),
        });

        const setupResult = await setupResponse.json();
        console.log("[Auth Callback] Setup result:", setupResult);

        if (!setupResponse.ok) {
          console.error("[Auth Callback] Setup failed:", setupResult);
          // Still redirect to login so user can try again
          return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(setupResult.error || "Failed to set up account")}`
          );
        }

        // Redirect based on role
        const role = setupResult.role;
        let redirectTo = "/instructor/dashboard";

        if (role === "student") {
          redirectTo = "/student/dashboard";
        } else if (role === "admin") {
          redirectTo = "/admin/dashboard";
        }

        console.log("[Auth Callback] Redirecting to:", redirectTo);
        return NextResponse.redirect(`${origin}${redirectTo}`);

      } catch (fetchError) {
        console.error("[Auth Callback] Fetch error calling setup-user:", fetchError);
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent("Failed to set up account. Please try logging in.")}`
        );
      }
    }
  }

  // No code provided - redirect to login
  console.log("[Auth Callback] No code provided, redirecting to login");
  return NextResponse.redirect(`${origin}/login`);
}
