"use client";

import { useEffect } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Button,
  Spinner,
  Badge,
} from "@/components/ui";
import { HardDrive, RefreshCw, TrendingUp } from "lucide-react";
import { useStorageQuota } from "@/lib/hooks/use-storage-quota";
import { useTenant } from "@/lib/hooks/use-tenant";

export default function StorageSettingsPage() {
  const { tenant } = useTenant();
  const { usage, isChecking, fetchUsage, getUsageDisplay } = useStorageQuota();

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const display = getUsageDisplay();

  // Determine status color based on usage percentage
  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 75) return "text-warning";
    return "text-success";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 75) return "bg-warning";
    return "bg-primary";
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Storage</h1>
        <p className="text-muted-foreground">
          Monitor your organization&apos;s storage usage
        </p>
      </div>

      {/* Storage Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Usage
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchUsage()}
              disabled={isChecking}
            >
              {isChecking ? (
                <Spinner size="sm" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Current storage consumption for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isChecking && !usage ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : display ? (
            <>
              {/* Main usage display */}
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-bold">{display.used}</div>
                  <div className="text-muted-foreground">
                    {display.isUnlimited
                      ? "Unlimited storage"
                      : `of ${display.limit} used`}
                  </div>
                </div>
                {!display.isUnlimited && (
                  <div
                    className={`text-2xl font-semibold ${getStatusColor(display.percentage)}`}
                  >
                    {display.percentage}%
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {!display.isUnlimited && (
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(display.percentage)} transition-all duration-500`}
                      style={{ width: `${Math.min(display.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{display.remaining} remaining</span>
                    <span>{display.limit} total</span>
                  </div>
                </div>
              )}

              {/* Subscription tier info */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">Your Plan</div>
                  <div className="text-sm text-muted-foreground">
                    Storage allocation based on subscription
                  </div>
                </div>
                <Badge className="capitalize">{tenant?.subscription_tier}</Badge>
              </div>

              {/* Warning if near limit */}
              {!display.isUnlimited && display.percentage >= 75 && (
                <div
                  className={`p-4 rounded-lg border ${
                    display.percentage >= 90
                      ? "bg-destructive/10 border-destructive/30"
                      : "bg-warning/10 border-warning/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <TrendingUp
                      className={`h-5 w-5 mt-0.5 ${
                        display.percentage >= 90
                          ? "text-destructive"
                          : "text-warning"
                      }`}
                    />
                    <div>
                      <div className="font-medium">
                        {display.percentage >= 90
                          ? "Storage Almost Full"
                          : "Running Low on Storage"}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {display.percentage >= 90
                          ? "You're almost out of storage space. Consider upgrading your plan or deleting unused files."
                          : "You've used more than 75% of your storage. Consider upgrading if you need more space."}
                      </p>
                      <Button variant="link" className="px-0 mt-2" asChild>
                        <a href="/admin/billing">Upgrade Plan</a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Unable to load storage information
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Limits by Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Limits by Plan</CardTitle>
          <CardDescription>
            Compare storage allocations across different subscription tiers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              className={`p-4 rounded-lg border ${tenant?.subscription_tier === "free" ? "border-primary bg-primary/5" : ""}`}
            >
              <div className="text-sm text-muted-foreground">Free</div>
              <div className="text-lg font-semibold">1 GB</div>
            </div>
            <div
              className={`p-4 rounded-lg border ${tenant?.subscription_tier === "pro" ? "border-primary bg-primary/5" : ""}`}
            >
              <div className="text-sm text-muted-foreground">Pro</div>
              <div className="text-lg font-semibold">25 GB</div>
            </div>
            <div
              className={`p-4 rounded-lg border ${tenant?.subscription_tier === "institution" ? "border-primary bg-primary/5" : ""}`}
            >
              <div className="text-sm text-muted-foreground">Institution</div>
              <div className="text-lg font-semibold">100 GB</div>
            </div>
            <div
              className={`p-4 rounded-lg border ${tenant?.subscription_tier === "enterprise" ? "border-primary bg-primary/5" : ""}`}
            >
              <div className="text-sm text-muted-foreground">Enterprise</div>
              <div className="text-lg font-semibold">Unlimited</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Optimize images:</strong> Compress images before uploading
            to save space without losing quality.
          </p>
          <p>
            <strong>Clean up old files:</strong> Regularly review and delete
            unused attachments and course materials.
          </p>
          <p>
            <strong>Use external links:</strong> For large video content,
            consider using YouTube or Vimeo embeds instead of direct uploads.
          </p>
          <p>
            <strong>Archive old courses:</strong> Export and archive completed
            courses to free up space for new content.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
