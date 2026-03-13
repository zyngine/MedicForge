"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";
import { Settings, DollarSign, Check } from "lucide-react";

export default function CEAdminSettingsPage() {
  const [price, setPrice] = useState("");
  const [savedPrice, setSavedPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data } = await supabase
        .from("ce_platform_settings")
        .select("value")
        .eq("key", "annual_subscription_price")
        .single();
      const val = data?.value || "99.00";
      setPrice(val);
      setSavedPrice(val);
    };
    load();
  }, []);

  const handleSave = async () => {
    const parsed = parseFloat(price);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid price greater than $0.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createCEClient();
    const { error: err } = await supabase
      .from("ce_platform_settings")
      .upsert({
        key: "annual_subscription_price",
        value: parsed.toFixed(2),
        updated_at: new Date().toISOString(),
      });
    if (err) {
      setError("Failed to save. Please try again.");
    } else {
      setSavedPrice(parsed.toFixed(2));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Platform Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure pricing and platform-wide options.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-5">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Subscription Pricing
        </h2>

        <div className="space-y-2 max-w-xs">
          <label className="text-sm font-medium">Annual Subscription Price</label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">$</span>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-32"
              placeholder="99.00"
            />
            <span className="text-sm text-muted-foreground">/ year</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Currently published at ${savedPrice}/year. Changes take effect immediately for new purchases.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        <Button onClick={handleSave} disabled={saving}>
          {saved ? (
            <><Check className="h-4 w-4 mr-2" />Saved</>
          ) : saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
