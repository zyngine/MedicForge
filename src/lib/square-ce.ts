const SQUARE_BASE =
  process.env.SQUARE_ENVIRONMENT === "sandbox" || process.env.NODE_ENV === "development"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
const SQUARE_VERSION = "2025-01-23";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "Square-Version": SQUARE_VERSION,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function squareFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${SQUARE_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok || data.errors) {
    throw new Error(data.errors?.[0]?.detail || `Square API error (${res.status})`);
  }
  return data;
}

// ─── One-time card charge (used for individual course purchases) ─────────────

export async function chargeCard(params: {
  sourceId: string;
  amountCents: number;
  idempotencyKey: string;
  note?: string;
}): Promise<{ paymentId: string }> {
  const data = await squareFetch("/v2/payments", {
    method: "POST",
    body: JSON.stringify({
      source_id: params.sourceId,
      idempotency_key: params.idempotencyKey,
      amount_money: { amount: params.amountCents, currency: "USD" },
      location_id: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || process.env.SQUARE_LOCATION_ID,
      note: params.note,
    }),
  });
  return { paymentId: data.payment.id };
}

// ─── Customer + card-on-file (used for auto-renewing subscriptions) ──────────

export async function createCustomer(params: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  idempotencyKey: string;
}): Promise<{ customerId: string }> {
  const data = await squareFetch("/v2/customers", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: params.idempotencyKey,
      email_address: params.email,
      given_name: params.firstName || undefined,
      family_name: params.lastName || undefined,
    }),
  });
  return { customerId: data.customer.id };
}

export async function saveCardOnFile(params: {
  sourceId: string;
  customerId: string;
  idempotencyKey: string;
}): Promise<{ cardId: string; lastFour: string; brand: string }> {
  const data = await squareFetch("/v2/cards", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: params.idempotencyKey,
      source_id: params.sourceId,
      card: { customer_id: params.customerId },
    }),
  });
  return {
    cardId: data.card.id,
    lastFour: data.card.last_4 || "",
    brand: data.card.card_brand || "",
  };
}

export async function disableCard(cardId: string): Promise<void> {
  await squareFetch(`/v2/cards/${cardId}/disable`, { method: "POST" });
}

// ─── Subscriptions (auto-renewing) ───────────────────────────────────────────

export async function createSubscription(params: {
  customerId: string;
  cardId: string;
  planVariationId: string;
  idempotencyKey: string;
}): Promise<{
  subscriptionId: string;
  status: string;
  startDate: string;
  nextBillingDate: string | null;
}> {
  const data = await squareFetch("/v2/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: params.idempotencyKey,
      location_id: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || process.env.SQUARE_LOCATION_ID,
      plan_variation_id: params.planVariationId,
      customer_id: params.customerId,
      card_id: params.cardId,
      timezone: "America/New_York",
    }),
  });

  const sub = data.subscription;
  return {
    subscriptionId: sub.id,
    status: sub.status,
    startDate: sub.start_date,
    nextBillingDate: sub.charged_through_date || null,
  };
}

export async function cancelSubscription(subscriptionId: string): Promise<{
  canceledDate: string | null;
  chargedThroughDate: string | null;
}> {
  const data = await squareFetch(`/v2/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
  });
  return {
    canceledDate: data.subscription.canceled_date || null,
    chargedThroughDate: data.subscription.charged_through_date || null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function retrieveSubscription(subscriptionId: string): Promise<any> {
  const data = await squareFetch(`/v2/subscriptions/${subscriptionId}`);
  return data.subscription;
}

// Update the card used for a subscription (after the customer updates their payment method)
export async function updateSubscriptionCard(
  subscriptionId: string,
  cardId: string
): Promise<void> {
  await squareFetch(`/v2/subscriptions/${subscriptionId}`, {
    method: "PUT",
    body: JSON.stringify({
      subscription: { card_id: cardId },
    }),
  });
}

// ─── Webhook signature verification ──────────────────────────────────────────

export async function verifyWebhookSignature(
  body: string,
  signature: string,
  notificationUrl: string
): Promise<boolean> {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key) return false;

  const crypto = await import("crypto");
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(notificationUrl + body);
  const expected = hmac.digest("base64");

  // constant-time comparison
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
