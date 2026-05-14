"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { ArrowLeft } from "lucide-react";
import { MaterialUploader, type UploaderResult } from "@/components/ce/custom-training/material-uploader";

export default function NewMaterialPage() {
  const router = useRouter();
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploaderResult | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: ce } = await supabase
        .from("ce_users")
        .select("agency_id")
        .eq("id", user.id)
        .single();
      setAgencyId(ce?.agency_id || null);
    };
    load();
  }, []);

  const save = async () => {
    if (!uploaded || !title.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/ce/agency/custom/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        content_type: uploaded.content_type,
        content_url: uploaded.content_url,
        content_metadata: uploaded.content_metadata,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }
    const { material } = await res.json();
    router.push(`/ce/agency/custom/${material.id}`);
  };

  if (!agencyId) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <button
        onClick={() => router.push("/ce/agency/custom")}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to materials
      </button>

      <div>
        <h1 className="text-2xl font-bold">Upload Custom Training</h1>
        <p className="text-muted-foreground text-sm mt-1">Add a new training material for your agency</p>
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">
            Title <span className="text-red-600">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="E.g. Patient Restraint SOP"
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional summary or context"
            className="w-full px-3 py-2 border rounded text-sm min-h-[80px]"
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Content</label>
          {uploaded ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm flex items-center justify-between">
              <span>{uploaded.content_type.replace("_", " ")} ready to attach</span>
              <button
                onClick={() => setUploaded(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Replace
              </button>
            </div>
          ) : (
            <MaterialUploader agencyId={agencyId} onUploaded={setUploaded} />
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={save} disabled={saving || !uploaded || !title.trim()}>
            {saving ? "Saving…" : "Create Material"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/ce/agency/custom")}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
