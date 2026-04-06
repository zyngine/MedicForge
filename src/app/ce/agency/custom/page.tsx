"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { FileText, Lock } from "lucide-react";

interface Agency {
  id: string;
  name: string;
  subscription_tier: string | null;
}

export default function CEAgencyCustomPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: me } = await supabase.from("ce_users").select("agency_id").eq("id", (await supabase.auth.getUser()).data.user?.id || "").single();
      if (me?.agency_id) {
        const { data } = await supabase.from("ce_agencies").select("id, name, subscription_tier").eq("id", me.agency_id).single();
        setAgency(data);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const isPro = agency?.subscription_tier === "pro" || agency?.subscription_tier === "enterprise";

  if (isLoading) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Custom Training</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload and manage your agency's proprietary training materials</p>
      </div>

      {!isPro ? (
        <div className="bg-white border rounded-lg p-8 flex flex-col items-center text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Lock className="h-6 w-6 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold">Custom Training requires a Pro or Enterprise subscription</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Upload your agency's SOPs, protocols, department-specific training videos, and custom assessments.
              Upgrade your plan to access this feature.
            </p>
          </div>
          <div className="bg-gray-50 border rounded-lg p-4 text-sm text-left max-w-md w-full space-y-2">
            <p className="font-medium text-sm">What's included:</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>• Upload PDF, video, and document materials</li>
              <li>• Create custom quizzes and assessments</li>
              <li>• Assign materials to specific employees or roles</li>
              <li>• Track completion and generate compliance reports</li>
              <li>• Brand with your agency logo and colors</li>
            </ul>
          </div>
          <Button onClick={() => window.location.href = "/ce/contact"}>Contact Us to Upgrade</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            Custom training content is scoped to your agency only. Employees outside your agency cannot access these materials.
          </div>

          {/* Placeholder for Pro content — full implementation in a future phase */}
          <div className="bg-white border rounded-lg p-6 flex flex-col items-center text-center space-y-3">
            <FileText className="h-8 w-8 text-gray-300" />
            <p className="text-sm font-medium">No custom training materials yet</p>
            <p className="text-xs text-muted-foreground">Upload your first document or video to get started.</p>
            <Button variant="outline" disabled>Upload Material</Button>
            <p className="text-xs text-muted-foreground">
              Full upload interface launching soon.{" "}
              <a href="/ce/contact" className="text-blue-700 hover:underline">Contact us</a> to request early access.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              { label: "Supported formats", value: "PDF, MP4, YouTube links, SCORM" },
              { label: "Storage included", value: "50 GB (Pro) / Unlimited (Enterprise)" },
              { label: "Max file size", value: "2 GB per upload" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white border rounded-lg p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
