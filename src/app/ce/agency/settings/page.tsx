"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Input } from "@/components/ui";

interface Agency {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  contact_email: string | null;
  subscription_tier: string | null;
  subscription_expires_at: string | null;
}

export default function CEAgencySettingsPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    contact_email: "",
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: me } = await supabase.from("ce_users").select("agency_id").eq("id", (await supabase.auth.getUser()).data.user?.id || "").single();
      if (!me?.agency_id) { setIsLoading(false); return; }

      const { data } = await supabase.from("ce_agencies").select("*").eq("id", me.agency_id).single();
      if (data) {
        setAgency(data);
        setForm({
          name: data.name || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          zip: data.zip || "",
          phone: data.phone || "",
          contact_email: data.contact_email || "",
        });
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    if (!agency) return;
    setSaving(true);
    const supabase = createCEClient();
    await supabase.from("ce_agencies").update({
      name: form.name,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
      phone: form.phone || null,
      contact_email: form.contact_email || null,
    }).eq("id", agency.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (!agency) return <div className="p-8 text-center text-muted-foreground">No agency found for your account.</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Agency Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your agency profile and contact information</p>
      </div>

      {/* Subscription info */}
      <div className="bg-white border rounded-lg p-5">
        <h2 className="font-semibold text-sm mb-3">Subscription</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Plan</p>
            <p className="font-medium capitalize">{agency.subscription_tier || "Standard"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Expires</p>
            <p className={`font-medium ${agency.subscription_expires_at && new Date(agency.subscription_expires_at) < new Date() ? "text-red-600" : ""}`}>
              {agency.subscription_expires_at ? new Date(agency.subscription_expires_at).toLocaleDateString() : "N/A"}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Contact your MedicForge administrator to change your subscription plan.</p>
      </div>

      {/* Agency profile */}
      <div className="bg-white border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-sm">Agency Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Agency Name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Address</label>
            <Input placeholder="Street address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">City</label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">State</label>
              <Input maxLength={2} placeholder="TX" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">ZIP</label>
              <Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Phone</label>
            <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Contact Email</label>
            <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving || !form.name}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {saved && <span className="text-sm text-green-700">Saved.</span>}
        </div>
      </div>
    </div>
  );
}
