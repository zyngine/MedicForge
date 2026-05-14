"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { FileText, Video, Plus, Lock, Trash2, Edit } from "lucide-react";
import { canUseCustomTraining } from "@/lib/ce-tiers";

interface Material {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  created_at: string;
  updated_at: string;
}

interface Agency {
  id: string;
  name: string;
  subscription_tier: string | null;
}

const TYPE_ICON: Record<string, typeof FileText> = {
  pdf: FileText,
  video_upload: Video,
  video_url: Video,
  scorm: FileText,
};

export default function CEAgencyCustomPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      const { data: me } = await supabase
        .from("ce_users")
        .select("agency_id")
        .eq("id", user.id)
        .single();
      if (me?.agency_id) {
        const { data: ag } = await supabase
          .from("ce_agencies")
          .select("id, name, subscription_tier")
          .eq("id", me.agency_id)
          .single();
        setAgency(ag);
        const { data: mats } = await supabase
          .from("ce_custom_materials")
          .select("id, title, description, content_type, created_at, updated_at")
          .eq("agency_id", me.agency_id)
          .order("updated_at", { ascending: false });
        setMaterials(mats || []);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this material? This will also remove any quiz, assignments, and completion records.")) return;
    const res = await fetch(`/api/ce/agency/custom/materials/${id}`, { method: "DELETE" });
    if (res.ok) setMaterials((m) => m.filter((x) => x.id !== id));
  };

  if (isLoading) return null;

  const allowed = canUseCustomTraining(agency?.subscription_tier ?? null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Training</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload and manage your agency&apos;s proprietary training materials
          </p>
        </div>
        {allowed && (
          <Link href="/ce/agency/custom/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Upload Material
            </Button>
          </Link>
        )}
      </div>

      {!allowed ? (
        <div className="bg-card border rounded-lg p-8 flex flex-col items-center text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Custom Training requires an Enterprise subscription</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Upload SOPs, protocols, training videos, and custom assessments scoped to your agency.
            </p>
          </div>
          <Button onClick={() => (window.location.href = "/ce/contact")}>Contact Us to Upgrade</Button>
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-card border rounded-lg p-8 flex flex-col items-center text-center space-y-3">
          <FileText className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium">No custom training materials yet</p>
          <p className="text-xs text-muted-foreground">Upload your first document or video to get started.</p>
          <Link href="/ce/agency/custom/new">
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Upload Material
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Updated</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => {
                const Icon = TYPE_ICON[m.content_type] || FileText;
                return (
                  <tr key={m.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <Link href={`/ce/agency/custom/${m.id}`} className="font-medium hover:underline">
                        {m.title}
                      </Link>
                      {m.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.description}</p>
                      )}
                    </td>
                    <td className="p-3">
                      <Icon className="h-4 w-4 text-muted-foreground inline mr-1" />
                      <span className="text-xs">{m.content_type.replace("_", " ")}</span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(m.updated_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/ce/agency/custom/${m.id}`}
                        className="inline-block p-1 hover:bg-muted rounded mr-1"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Link>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1 hover:bg-muted rounded"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
