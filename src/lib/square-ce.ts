const SQUARE_BASE =
  process.env.SQUARE_ENVIRONMENT === "sandbox" || process.env.NODE_ENV === "development"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
const SQUARE_VERSION = "2025-01-23";

export async function chargeCard(params: {
  sourceId: string;
  amountCents: number;
  idempotencyKey: string;
  note?: string;
}): Promise<{ paymentId: string }> {
  const res = await fetch(`${SQUARE_BASE}/v2/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
    body: JSON.stringify({
      source_id: params.sourceId,
      idempotency_key: params.idempotencyKey,
      amount_money: {
        amount: params.amountCents,
        currency: "USD",
      },
      location_id: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || process.env.SQUARE_LOCATION_ID,
      note: params.note,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.errors) {
    throw new Error(data.errors?.[0]?.detail || "Payment failed");
  }
  return { paymentId: data.payment.id };
}
