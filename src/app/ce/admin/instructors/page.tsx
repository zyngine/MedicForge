"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Input } from "@/components/ui";
import { GraduationCap, Plus, Search, X, AlertCircle } from "lucide-react";

interface Instructor {
  id: string;
  name: string;
  email: string;
  credentials: string | null;
  employer: string | null;
  years_experience: number | null;
  is_medical_director: boolean;
  status: string;
  coi_expires_at: string | null;
  expertise_areas: string[];
}

const EXPERTISE_OPTIONS = [
  "Airway", "Cardiology", "Trauma", "Medical", "Operations",
  "Pediatric", "OB/Gynecology", "Behavioral", "Hazmat", "EMS Operations",
];

export default function CEAdminInstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    credentials: "",
    employer: "",
    years_experience: "",
    is_medical_director: false,
    expertise_areas: [] as string[],
  });

  const load = async () => {
    const supabase = createCEClient();
    const { data } = await supabase
      .from("ce_instructors")
      .select("id, name, email, credentials, employer, years_experience, is_medical_director, status, coi_expires_at, expertise_areas")
      .order("name");
    setInstructors((data as Instructor[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleExpertise = (area: string) => {
    setForm((prev) => ({
      ...prev,
      expertise_areas: prev.expertise_areas.includes(area)
        ? prev.expertise_areas.filter((a) => a !== area)
        : [...prev.expertise_areas, area],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setSaveError("Name and email are required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const supabase = createCEClient();
    const { error } = await supabase.from("ce_instructors").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      credentials: form.credentials || null,
      employer: form.employer || null,
      years_experience: form.years_experience ? parseInt(form.years_experience) : null,
      is_medical_director: form.is_medical_director,
      expertise_areas: form.expertise_areas,
      status: "active",
    });
    if (error) {
      setSaveError("Failed to add instructor. Please try again.");
    } else {
      setShowForm(false);
      setForm({ name: "", email: "", credentials: "", employer: "", years_experience: "", is_medical_director: false, expertise_areas: [] });
      load();
    }
    setSaving(false);
  };

  const filtered = instructors.filter((i) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return i.name.toLowerCase().includes(s) || i.email.toLowerCase().includes(s);
  });

  const coiExpiringSoon = instructors.filter((i) => {
    if (!i.coi_expires_at) return false;
    return (new Date(i.coi_expires_at).getTime() - Date.now()) / 86400000 < 90;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Instructors</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage CE instructors and medical directors</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Instructor
        </Button>
      </div>

      {coiExpiringSoon.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">COI Forms Expiring Soon</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              {coiExpiringSoon.map((i) => i.name).join(", ")} — renew before expiration to maintain CAPCE compliance.
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Add Instructor</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          {saveError && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{saveError}</div>
          )}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Full Name *</label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Credentials</label>
                <Input value={form.credentials} onChange={(e) => setForm((p) => ({ ...p, credentials: e.target.value }))} placeholder="NRP, FP-C, CCEMT-P" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Employer</label>
                <Input value={form.employer} onChange={(e) => setForm((p) => ({ ...p, employer: e.target.value }))} placeholder="City EMS" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Years of Experience</label>
                <Input type="number" min="0" value={form.years_experience} onChange={(e) => setForm((p) => ({ ...p, years_experience: e.target.value }))} placeholder="10" />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_medical_director} onChange={(e) => setForm((p) => ({ ...p, is_medical_director: e.target.checked }))} className="accent-red-700" />
                  <span className="text-sm font-medium">Medical Director</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expertise Areas</label>
              <div className="flex flex-wrap gap-2">
                {EXPERTISE_OPTIONS.map((area) => (
                  <button key={area} type="button" onClick={() => toggleExpertise(area)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${form.expertise_areas.includes(area) ? "bg-red-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    {area}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Instructor"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search instructors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <GraduationCap className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No instructors yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Instructor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Credentials</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expertise</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">COI Expires</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inst) => {
                const coiDays = inst.coi_expires_at
                  ? (new Date(inst.coi_expires_at).getTime() - Date.now()) / 86400000
                  : null;
                return (
                  <tr key={inst.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{inst.name}</p>
                          <p className="text-xs text-muted-foreground">{inst.email}</p>
                        </div>
                        {inst.is_medical_director && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">MD</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{inst.credentials || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(inst.expertise_areas || []).slice(0, 3).map((a) => (
                          <span key={a} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{a}</span>
                        ))}
                        {(inst.expertise_areas || []).length > 3 && (
                          <span className="text-xs text-muted-foreground">+{(inst.expertise_areas || []).length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {inst.coi_expires_at ? (
                        <span className={`text-xs font-medium ${coiDays !== null && coiDays < 90 ? "text-yellow-700" : "text-muted-foreground"}`}>
                          {new Date(inst.coi_expires_at).toLocaleDateString()}
                          {coiDays !== null && coiDays < 90 && " ⚠"}
                        </span>
                      ) : (
                        <span className="text-xs text-red-600">Not on file</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inst.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {inst.status}
                      </span>
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
