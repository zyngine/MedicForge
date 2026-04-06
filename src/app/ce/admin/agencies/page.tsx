"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Input, Select } from "@/components/ui";
import { Building2, Plus, X, Copy, Check } from "lucide-react";

interface Agency {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  subscription_tier: string;
  subscription_end: string | null;
  invite_code: string | null;
  created_at: string;
  user_count?: number;
}

const TIERS = [
  { value: "starter", label: "Starter" },
  { value: "team", label: "Team" },
  { value: "agency", label: "Agency" },
  { value: "enterprise", label: "Enterprise" },
  { value: "enterprise_plus", label: "Enterprise+" },
  { value: "custom", label: "Custom" },
];

const TIER_STYLES: Record<string, string> = {
  starter: "bg-gray-100 text-gray-700",
  team: "bg-blue-100 text-blue-700",
  agency: "bg-purple-100 text-purple-700",
  enterprise: "bg-red-100 text-red-700",
  enterprise_plus: "bg-red-100 text-red-700",
  custom: "bg-yellow-100 text-yellow-800",
};

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CEAdminAgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    subscription_tier: "starter",
    subscription_start: new Date().toISOString().split("T")[0],
    subscription_end: "",
    invite_code: generateInviteCode(),
  });

  const load = async () => {
    const supabase = createCEClient();
    const { data } = await supabase
      .from("ce_agencies")
      .select("id, name, city, state, subscription_tier, subscription_end, invite_code, created_at")
      .order("name");

    if (data) {
      // Get user counts per agency
      const { data: users } = await supabase
        .from("ce_users")
        .select("agency_id")
        .not("agency_id", "is", null);

      const counts = (users || []).reduce((acc: Record<string, number>, u: { agency_id: string | null }) => {
        if (u.agency_id) acc[u.agency_id] = (acc[u.agency_id] || 0) + 1;
        return acc;
      }, {});

      setAgencies(data.map((a: Agency) => ({ ...a, user_count: counts[a.id] || 0 })));
    }
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setSaveError("Agency name is required."); return; }
    setSaving(true);
    setSaveError(null);
    const supabase = createCEClient();
    const { error } = await supabase.from("ce_agencies").insert({
      name: form.name.trim(),
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
      phone: form.phone || null,
      subscription_tier: form.subscription_tier,
      subscription_start: form.subscription_start || null,
      subscription_end: form.subscription_end || null,
      invite_code: form.invite_code || generateInviteCode(),
    });
    if (error) { setSaveError("Failed to create agency."); }
    else {
      setShowForm(false);
      setForm({ name: "", address: "", city: "", state: "", zip: "", phone: "", subscription_tier: "starter", subscription_start: new Date().toISOString().split("T")[0], subscription_end: "", invite_code: generateInviteCode() });
      load();
    }
    setSaving(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agencies</h1>
          <p className="text-muted-foreground text-sm mt-1">{agencies.length} registered agenc{agencies.length !== 1 ? "ies" : "y"}</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}><Plus className="h-4 w-4 mr-2" />Add Agency</Button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Add Agency</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
          {saveError && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{saveError}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Agency Name *</label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="City Fire Department" required />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Address</label>
                <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="123 Main St" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">City</label>
                <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} placeholder="Springfield" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">State</label>
                <Select value={form.state} onChange={(v) => setForm((p) => ({ ...p, state: v }))}
                  options={[{ value: "", label: "Select state..." }, ...US_STATES.map((s) => ({ value: s, label: s }))]} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">ZIP</label>
                <Input value={form.zip} onChange={(e) => setForm((p) => ({ ...p, zip: e.target.value }))} placeholder="62701" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(555) 555-5555" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Subscription Tier</label>
                <Select value={form.subscription_tier} onChange={(v) => setForm((p) => ({ ...p, subscription_tier: v }))} options={TIERS} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Invite Code</label>
                <div className="flex gap-2">
                  <Input value={form.invite_code} onChange={(e) => setForm((p) => ({ ...p, invite_code: e.target.value.toUpperCase() }))} placeholder="ABC123" className="font-mono" />
                  <button type="button" onClick={() => setForm((p) => ({ ...p, invite_code: generateInviteCode() }))} className="text-xs text-muted-foreground hover:text-foreground border rounded px-2">New</button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Subscription Start</label>
                <Input type="date" value={form.subscription_start} onChange={(e) => setForm((p) => ({ ...p, subscription_start: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Subscription End</label>
                <Input type="date" value={form.subscription_end} onChange={(e) => setForm((p) => ({ ...p, subscription_end: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Agency"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        ) : agencies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Building2 className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No agencies yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Agency</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tier</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Users</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sub Expires</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invite Code</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map((agency) => {
                // eslint-disable-next-line react-hooks/purity -- Date.now() for display
                const expiringSoon = agency.subscription_end && (new Date(agency.subscription_end).getTime() - Date.now()) / 86400000 < 30;
                return (
                  <tr key={agency.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{agency.name}</p>
                      <p className="text-xs text-muted-foreground">Since {new Date(agency.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{[agency.city, agency.state].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TIER_STYLES[agency.subscription_tier] || "bg-gray-100 text-gray-700"}`}>
                        {TIERS.find((t) => t.value === agency.subscription_tier)?.label || agency.subscription_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{agency.user_count}</td>
                    <td className="px-4 py-3">
                      {agency.subscription_end ? (
                        <span className={`text-xs ${expiringSoon ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          {new Date(agency.subscription_end).toLocaleDateString()}{expiringSoon ? " ⚠" : ""}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {agency.invite_code && (
                        <button
                          onClick={() => copyCode(agency.invite_code!)}
                          className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
                          title="Copy invite code"
                        >
                          {agency.invite_code}
                          {copiedCode === agency.invite_code
                            ? <Check className="h-3 w-3 text-green-500" />
                            : <Copy className="h-3 w-3" />}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
