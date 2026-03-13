"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { CEHeader } from "@/components/ce/CEHeader";
import { Button } from "@/components/ui";
import { CheckCircle, CreditCard, Lock, Star } from "lucide-react";

declare global {
  interface Window {
    Square?: any;
  }
}

const PERKS = [
  "Unlimited access to all CE courses",
  "CAPCE-approved continuing education",
  "Digital certificates for every completed course",
  "Track CEH hours toward NREMT recertification",
  "New courses added throughout the year at no extra cost",
];

export default function CESubscribePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [price, setPrice] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionExpires, setSubscriptionExpires] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [card, setCard] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();

      // Load price (public)
      const { data: setting } = await supabase
        .from("ce_platform_settings")
        .select("value")
        .eq("key", "annual_subscription_price")
        .single();
      setPrice(parseFloat(setting?.value || "99.00"));

      // Check auth + subscription
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoggedIn(false);
        return;
      }

      const { data: ceUser } = await supabase
        .from("ce_users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!ceUser) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);

      const now = new Date().toISOString();
      const { data: sub } = await supabase
        .from("ce_user_subscriptions")
        .select("expires_at")
        .eq("user_id", ceUser.id)
        .eq("status", "active")
        .gt("expires_at", now)
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) {
        setHasSubscription(true);
        setSubscriptionExpires(new Date(sub.expires_at).toLocaleDateString());
      }
    };

    load();
  }, []);

  // Load Square SDK after we know user is logged in and not already subscribed
  useEffect(() => {
    if (isLoggedIn !== true || hasSubscription) return;
    if (typeof window === "undefined") return;
    if (window.Square) {
      setScriptLoaded(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://web.squarecdn.com/v1/square.js";
    s.onload = () => setScriptLoaded(true);
    s.onerror = () => setError("Failed to load payment SDK. Please refresh.");
    document.head.appendChild(s);
  }, [isLoggedIn, hasSubscription]);

  // Attach card form
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || hasSubscription) return;
    let cardInst: any;

    const init = async () => {
      try {
        const payments = window.Square!.payments(
          process.env.NEXT_PUBLIC_SQUARE_APP_ID!,
          process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!
        );
        cardInst = await payments.card();
        await cardInst.attach(containerRef.current);
        setCard(cardInst);
      } catch (e) {
        console.error("Square init:", e);
        setError("Payment form failed to load. Please refresh.");
      }
    };

    init();

    return () => {
      if (cardInst) cardInst.destroy().catch(() => {});
    };
  }, [scriptLoaded, hasSubscription]);

  const handleSubscribe = async () => {
    if (!card || price === null) return;
    setProcessing(true);
    setError(null);

    try {
      const result = await card.tokenize();
      if (result.status !== "OK") {
        setError(result.errors?.[0]?.message || "Card declined. Please check your details.");
        setProcessing(false);
        return;
      }

      const res = await fetch("/api/ce/checkout/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription", sourceId: result.token }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Payment failed. Please try again.");
        setProcessing(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/ce/catalog"), 2500);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <CEHeader />

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold">Annual CE Subscription</h1>
          <p className="text-muted-foreground mt-2 text-base max-w-xl mx-auto">
            Unlimited access to all continuing education courses for EMS providers.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Perks */}
          <div className="space-y-5">
            <div>
              <div className="text-4xl font-bold">
                {price !== null ? `$${price.toFixed(2)}` : "—"}
                <span className="text-base font-normal text-muted-foreground ml-2">/year</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">One payment. 12 months of access.</p>
            </div>

            <ul className="space-y-3">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  {perk}
                </li>
              ))}
            </ul>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-2">
              <Star className="h-3.5 w-3.5 shrink-0" />
              CAPCE-approved courses included. Certificates issued automatically upon completion.
            </p>
          </div>

          {/* Payment panel */}
          <div className="bg-white border rounded-xl p-6 space-y-5">
            {success ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-lg">Subscription activated!</p>
                <p className="text-sm text-muted-foreground mt-1">Redirecting to course catalog...</p>
              </div>
            ) : hasSubscription ? (
              <div className="text-center py-8">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="font-semibold">You have an active subscription</p>
                <p className="text-sm text-muted-foreground mt-1">Expires {subscriptionExpires}</p>
                <Link href="/ce/catalog">
                  <Button className="mt-5 w-full">Browse Courses</Button>
                </Link>
              </div>
            ) : isLoggedIn === false ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">Sign in to subscribe.</p>
                <Link href="/ce/login?redirect=/ce/subscribe">
                  <Button className="w-full">Sign In</Button>
                </Link>
                <Link href="/ce/register?redirect=/ce/subscribe">
                  <Button variant="outline" className="w-full">Create Account</Button>
                </Link>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-sm">Payment Details</h3>

                {error && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {error}
                  </div>
                )}

                <div ref={containerRef} className="min-h-[100px]" />

                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Annual subscription</span>
                  <span className="font-bold">${price?.toFixed(2) ?? "—"}/yr</span>
                </div>

                <Button
                  onClick={handleSubscribe}
                  disabled={processing || !card}
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {processing ? "Processing..." : `Subscribe — $${price?.toFixed(2) ?? "—"}/yr`}
                </Button>

                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" />
                  Payments secured by Square
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
