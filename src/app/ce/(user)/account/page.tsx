"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useRef, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Input } from "@/components/ui";
import { Button } from "@/components/ui";
import { Alert } from "@/components/ui";
import { Select } from "@/components/ui";
import { Spinner } from "@/components/ui";
import { Badge } from "@/components/ui";
import Link from "next/link";
import { User, Shield, Save, CreditCard, CheckCircle, Clock, X, Lock } from "lucide-react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Square?: any;
  }
}

function UpdateCardModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [card, setCard] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.Square) { setScriptLoaded(true); return; }
    const s = document.createElement("script");
    s.src = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === "sandbox"
      ? "https://sandbox.web.squarecdn.com/v1/square.js"
      : "https://web.squarecdn.com/v1/square.js";
    s.onload = () => setScriptLoaded(true);
    s.onerror = () => setError("Failed to load payment SDK. Please refresh.");
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cardInst: any;
    (async () => {
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
        setError("Payment form failed to load.");
      }
    })();
    return () => { if (cardInst) cardInst.destroy().catch(() => {}); };
  }, [scriptLoaded]);

  const handleSubmit = async () => {
    if (!card) return;
    setProcessing(true);
    setError(null);
    try {
      const result = await card.tokenize();
      if (result.status !== "OK") {
        setError(result.errors?.[0]?.message || "Card declined.");
        setProcessing(false);
        return;
      }
      const res = await fetch("/api/ce/subscription/update-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: result.token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update card.");
        setProcessing(false);
        return;
      }
      onSuccess();
    } catch {
      setError("An unexpected error occurred.");
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
          <h3 className="font-semibold">Update Payment Card</h3>
          <button onClick={onClose} disabled={processing} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}
          <div ref={containerRef} className="min-h-[100px]" />
          <Button onClick={handleSubmit} disabled={processing || !card} className="w-full">
            <CreditCard className="h-4 w-4 mr-2" />
            {processing ? "Updating..." : "Update Card"}
          </Button>
          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" /> Payments secured by Square
          </p>
        </div>
      </div>
    </div>
  );
}

interface Subscription {
  id: string;
  plan: string;
  price: number;
  starts_at: string;
  expires_at: string;
  status: string;
  auto_renew: boolean | null;
  canceled_at: string | null;
  card_last_four: string | null;
  card_brand: string | null;
  next_billing_at: string | null;
  grace_period_ends_at: string | null;
}

interface Purchase {
  id: string;
  purchased_at: string;
  amount: number;
  refunded: boolean;
  ce_courses: { title: string; id: string } | null;
}

const CERTIFICATION_LEVELS = [
  { value: "EMR", label: "Emergency Medical Responder (EMR)" },
  { value: "EMT", label: "Emergency Medical Technician (EMT)" },
  { value: "AEMT", label: "Advanced EMT (AEMT)" },
  { value: "Paramedic", label: "Paramedic" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
];

interface CEUserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  nremt_id: string | null;
  certification_level: string | null;
  state: string | null;
  role: string;
  preferred_language: string | null;
  terms_accepted_at: string | null;
  created_at: string | null;
}

export default function CEAccountPage() {
  const [profile, setProfile] = useState<CEUserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Subscription management
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showUpdateCard, setShowUpdateCard] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nremtId, setNremtId] = useState("");
  const [certLevel, setCertLevel] = useState("");
  const [state, setState] = useState("");
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createCEClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("ce_users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setNremtId(data.nremt_id || "");
        setCertLevel(data.certification_level || "");
        setState(data.state || "");
        setLanguage(data.preferred_language || "en");

        const now = new Date().toISOString();
        const [subRes, purchRes] = await Promise.all([
          supabase
            .from("ce_user_subscriptions")
            .select("id, plan, price, starts_at, expires_at, status, auto_renew, canceled_at, card_last_four, card_brand, next_billing_at, grace_period_ends_at")
            .eq("user_id", user.id)
            .in("status", ["active", "past_due"])
            .gt("expires_at", now)
            .order("expires_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("ce_purchases")
            .select("id, purchased_at, amount, refunded, ce_courses(title, id)")
            .eq("user_id", user.id)
            .order("purchased_at", { ascending: false })
            .limit(10),
        ]);
        setSubscription((subRes.data as Subscription) || null);
        setPurchases((purchRes.data || []) as Purchase[]);
      }
      setIsLoading(false);
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const supabase = createCEClient();
    const { error } = await supabase
      .from("ce_users")
      .update({
        first_name: firstName,
        last_name: lastName,
        nremt_id: nremtId || null,
        certification_level: certLevel || null,
        state: state || null,
        preferred_language: language,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      setSaveError("Failed to save changes. Please try again.");
    } else {
      setSaveSuccess(true);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              first_name: firstName,
              last_name: lastName,
              nremt_id: nremtId || null,
              certification_level: certLevel || null,
              state: state || null,
              preferred_language: language,
            }
          : prev
      );
      setTimeout(() => setSaveSuccess(false), 3000);
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-1">
          Keep your profile accurate — your name and NREMT ID appear on your certificates.
        </p>
      </div>

      {saveError && <Alert variant="error">{saveError}</Alert>}
      {saveSuccess && <Alert variant="success">Profile updated successfully.</Alert>}

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              value={profile?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed here. Contact support if you need to update your email.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Preferred Language</label>
            <Select
              value={language}
              onChange={(value) => setLanguage(value)}
              options={LANGUAGES}
            />
          </div>
        </CardContent>
      </Card>

      {/* EMS Credentials Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            EMS Credentials
            <Badge variant="outline" className="ml-auto text-xs font-normal">
              Appears on certificates
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              NREMT ID{" "}
              <span className="text-muted-foreground font-normal">(strongly recommended)</span>
            </label>
            <Input
              value={nremtId}
              onChange={(e) => setNremtId(e.target.value)}
              placeholder="E-123456"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Your NREMT ID is printed on your CE certificate and required for NREMT reporting.
              Format: E-XXXXXX or NRP-XXXXXX.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Certification Level</label>
              <Select
                value={certLevel}
                onChange={(value) => setCertLevel(value)}
                options={[
                  { value: "", label: "Select level..." },
                  ...CERTIFICATION_LEVELS,
                ]}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">State of Practice</label>
              <Select
                value={state}
                onChange={(value) => setState(value)}
                options={[
                  { value: "", label: "Select state..." },
                  ...US_STATES.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription & Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription & Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current plan */}
          {subscription ? (
            <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {subscription.status === "past_due" ? (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    <span className="text-sm font-semibold capitalize">
                      {subscription.plan} subscription
                    </span>
                    {subscription.status === "past_due" && (
                      <Badge variant="warning">Payment Failed</Badge>
                    )}
                    {subscription.canceled_at && (
                      <Badge variant="secondary">Canceled</Badge>
                    )}
                    {subscription.auto_renew && !subscription.canceled_at && (
                      <Badge variant="default">Auto-renewing</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ${subscription.price.toFixed(2)}/year
                    {subscription.canceled_at
                      ? ` · access until ${new Date(subscription.expires_at).toLocaleDateString()}`
                      : subscription.next_billing_at
                      ? ` · next billing ${new Date(subscription.next_billing_at).toLocaleDateString()}`
                      : ` · expires ${new Date(subscription.expires_at).toLocaleDateString()}`}
                  </p>
                  {subscription.card_last_four && (
                    <p className="text-xs text-muted-foreground">
                      {subscription.card_brand || "Card"} ending in •••• {subscription.card_last_four}
                    </p>
                  )}
                  {subscription.grace_period_ends_at && subscription.status === "past_due" && (
                    <p className="text-xs text-yellow-700 mt-1">
                      Please update your card by {new Date(subscription.grace_period_ends_at).toLocaleDateString()} to avoid losing access.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowUpdateCard(true)}
                  >
                    Update Card
                  </Button>
                  {!subscription.canceled_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>

              {cancelError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {cancelError}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">No active subscription</span>
              </div>
              <Link href="/ce/subscribe">
                <Button size="sm">Subscribe</Button>
              </Link>
            </div>
          )}

          {/* Cancel confirmation modal */}
          {showCancelConfirm && subscription && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-card rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <h3 className="font-semibold text-lg">Cancel subscription?</h3>
                <p className="text-sm text-muted-foreground">
                  You&apos;ll keep access to all CE courses until <strong>{new Date(subscription.expires_at).toLocaleDateString()}</strong>. After that, your subscription won&apos;t renew.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => { setShowCancelConfirm(false); setCancelError(null); }}
                    disabled={isCanceling}
                  >
                    Keep Subscription
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      setIsCanceling(true);
                      setCancelError(null);
                      try {
                        const res = await fetch("/api/ce/subscription/cancel", { method: "POST" });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed to cancel");
                        setShowCancelConfirm(false);
                        // Refresh page to show updated state
                        window.location.reload();
                      } catch (err) {
                        setCancelError(err instanceof Error ? err.message : "Cancellation failed");
                      } finally {
                        setIsCanceling(false);
                      }
                    }}
                    disabled={isCanceling}
                  >
                    {isCanceling ? "Canceling..." : "Cancel Subscription"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Update card modal */}
          {showUpdateCard && (
            <UpdateCardModal
              onClose={() => setShowUpdateCard(false)}
              onSuccess={() => { setShowUpdateCard(false); window.location.reload(); }}
            />
          )}

          {/* Purchase history */}
          {purchases.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Course Purchases</p>
              <div className="space-y-2">
                {purchases.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {p.refunded ? (
                        <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Refunded</span>
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      )}
                      <span className={p.refunded ? "text-muted-foreground line-through" : ""}>
                        {p.ce_courses?.title || "Course"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">
                        {new Date(p.purchased_at).toLocaleDateString()}
                      </span>
                      <span className="font-medium">${p.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account type</span>
            <Badge variant="outline">{profile?.role || "user"}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Terms accepted</span>
            <span>
              {profile?.terms_accepted_at
                ? new Date(profile.terms_accepted_at).toLocaleDateString()
                : "Not accepted"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member since</span>
            <span>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
