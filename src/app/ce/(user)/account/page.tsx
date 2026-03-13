"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Input } from "@/components/ui";
import { Button } from "@/components/ui";
import { Alert } from "@/components/ui";
import { Select } from "@/components/ui";
import { Spinner } from "@/components/ui";
import { Badge } from "@/components/ui";
import Link from "next/link";
import { User, Shield, Save, CreditCard, CheckCircle, Clock } from "lucide-react";

interface Subscription {
  id: string;
  plan: string;
  price: number;
  starts_at: string;
  expires_at: string;
  status: string;
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
            .select("id, plan, price, starts_at, expires_at, status")
            .eq("user_id", user.id)
            .eq("status", "active")
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
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
            <div>
              <p className="text-sm font-medium">Current Plan</p>
              {subscription ? (
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium capitalize">
                    {subscription.plan} subscription
                  </span>
                  <span className="text-xs text-muted-foreground">
                    — expires {new Date(subscription.expires_at).toLocaleDateString()}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">No active subscription</span>
                </div>
              )}
            </div>
            {!subscription && (
              <Link href="/ce/subscribe">
                <Button size="sm">Subscribe</Button>
              </Link>
            )}
          </div>

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
