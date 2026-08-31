import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

const sendEmailMock = vi.fn();
vi.mock("@/lib/notifications/email-service", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

const SECRET_B64 = Buffer.from("medicforge-test-secret-key-000000").toString("base64");

function signedRequest(body: unknown, opts: { secret?: string; timestamp?: number } = {}) {
  const payload = JSON.stringify(body);
  const id = "msg_test";
  const timestamp = String(opts.timestamp ?? Math.floor(Date.now() / 1000));
  const secret = opts.secret ?? SECRET_B64;
  const signature =
    "v1," +
    crypto
      .createHmac("sha256", Buffer.from(secret, "base64"))
      .update(`${id}.${timestamp}.${payload}`)
      .digest("base64");

  return new Request("https://www.medicforge.net/api/auth/hooks/send-email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": timestamp,
      "webhook-signature": signature,
    },
    body: payload,
  });
}

function hookPayload(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      email: "medic@example.test",
      user_metadata: { full_name: "Alex Medic" },
      ...(overrides.user as object),
    },
    email_data: {
      token: "305805",
      token_hash: "hash_for_new_address",
      redirect_to: "https://metro-ems.medicforge.net/auth/accept-invite",
      email_action_type: "invite",
      site_url: "https://www.medicforge.net",
      ...(overrides.email_data as object),
    },
  };
}

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

describe("send-email auth hook", () => {
  beforeEach(() => {
    sendEmailMock.mockReset();
    sendEmailMock.mockResolvedValue({ success: true, messageId: "re_123" });
    process.env.SEND_EMAIL_HOOK_SECRET = `v1,whsec_${SECRET_B64}`;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abcdefgh.supabase.co";
  });

  afterEach(() => {
    delete process.env.SEND_EMAIL_HOOK_SECRET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("sends the email for a validly signed invite", async () => {
    const { POST } = await loadRoute();
    const res = await POST(signedRequest(hookPayload()));

    expect(res.status).toBe(200);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [{ to, template }] = sendEmailMock.mock.calls[0];
    expect(to).toBe("medic@example.test");
    expect(template.subject).toContain("Set up your");
  });

  it("points the action link at the Supabase verify endpoint", async () => {
    const { POST } = await loadRoute();
    await POST(signedRequest(hookPayload()));

    const [{ template }] = sendEmailMock.mock.calls[0];
    expect(template.html).toContain(
      "https://abcdefgh.supabase.co/auth/v1/verify?token=hash_for_new_address&amp;type=invite"
    );
    expect(template.html).toContain(
      encodeURIComponent("https://metro-ems.medicforge.net/auth/accept-invite")
    );
  });

  it("rejects a request signed with the wrong secret and sends nothing", async () => {
    const { POST } = await loadRoute();
    const wrong = Buffer.from("a-completely-different-secret-000").toString("base64");
    const res = await POST(signedRequest(hookPayload(), { secret: wrong }));

    expect(res.status).toBe(401);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects an unsigned request", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      new Request("https://www.medicforge.net/api/auth/hooks/send-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(hookPayload()),
      })
    );

    expect(res.status).toBe(401);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects a replayed request with a stale timestamp", async () => {
    const { POST } = await loadRoute();
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    const res = await POST(signedRequest(hookPayload(), { timestamp: oneHourAgo }));

    expect(res.status).toBe(401);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("refuses to send when the hook secret is missing", async () => {
    delete process.env.SEND_EMAIL_HOOK_SECRET;
    const { POST } = await loadRoute();
    const res = await POST(signedRequest(hookPayload()));

    expect(res.status).toBe(500);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("renders a recovery email as a password reset", async () => {
    const { POST } = await loadRoute();
    await POST(
      signedRequest(
        hookPayload({
          email_data: {
            token: "111111",
            token_hash: "recovery_hash",
            redirect_to: "https://www.medicforge.net/reset-password",
            email_action_type: "recovery",
            site_url: "https://www.medicforge.net",
          },
        })
      )
    );

    const [{ template }] = sendEmailMock.mock.calls[0];
    expect(template.subject).toBe("Reset Your MedicForge Password");
    expect(template.html).toContain("type=recovery");
  });

  it("sends a reauthentication code with no action link", async () => {
    const { POST } = await loadRoute();
    await POST(
      signedRequest(
        hookPayload({
          email_data: {
            token: "424242",
            token_hash: "reauth_hash",
            redirect_to: "",
            email_action_type: "reauthentication",
            site_url: "https://www.medicforge.net",
          },
        })
      )
    );

    const [{ template }] = sendEmailMock.mock.calls[0];
    expect(template.subject).toContain("424242");
    expect(template.html).toContain("424242");
    expect(template.html).not.toContain("/auth/v1/verify");
  });

  it("pairs the reversed token hashes correctly on a secure email change", async () => {
    // Supabase names these backwards: the CURRENT address verifies with
    // token_hash_new, the NEW address with token_hash.
    const { POST } = await loadRoute();
    await POST(
      signedRequest(
        hookPayload({
          user: {
            email: "old@example.test",
            new_email: "new@example.test",
            user_metadata: { full_name: "Alex Medic" },
          },
          email_data: {
            token: "111111",
            token_hash: "hash_for_new_address",
            token_new: "222222",
            token_hash_new: "hash_for_current_address",
            redirect_to: "https://www.medicforge.net/account",
            email_action_type: "email_change",
            site_url: "https://www.medicforge.net",
          },
        })
      )
    );

    const [{ to, template }] = sendEmailMock.mock.calls[0];
    expect(to).toBe("old@example.test");
    expect(template.html).toContain("hash_for_current_address");
    expect(template.html).not.toContain("hash_for_new_address");
  });

  it("returns an error for an action type it cannot render", async () => {
    const { POST } = await loadRoute();
    const res = await POST(
      signedRequest(
        hookPayload({
          email_data: {
            token: "1",
            token_hash: "h",
            redirect_to: "",
            email_action_type: "something_new",
            site_url: "https://www.medicforge.net",
          },
        })
      )
    );

    expect(res.status).toBe(400);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("reports a Resend failure instead of returning success", async () => {
    sendEmailMock.mockResolvedValue({ success: false, error: "domain not verified" });
    const { POST } = await loadRoute();
    const res = await POST(signedRequest(hookPayload()));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).toContain("domain not verified");
  });
});
