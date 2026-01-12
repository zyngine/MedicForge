"use client";

import { Package, Play, Trash2, Loader2, Clock, Users, CheckCircle } from "lucide-react";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { ScormPackage } from "@/lib/hooks/use-scorm";
import { getLessonStatusLabel } from "@/lib/scorm-utils";
import { format } from "date-fns";

interface ScormPackageCardProps {
  package: ScormPackage;
  onLaunch?: (pkg: ScormPackage) => void;
  onDelete?: (pkg: ScormPackage) => void;
  isDeleting?: boolean;
  attemptStatus?: string | null;
  showActions?: boolean;
}

export function ScormPackageCard({
  package: pkg,
  onLaunch,
  onDelete,
  isDeleting,
  attemptStatus,
  showActions = true,
}: ScormPackageCardProps) {
  const statusLabel = attemptStatus ? getLessonStatusLabel(attemptStatus) : null;

  const getStatusBadge = () => {
    switch (pkg.status) {
      case "uploading":
        return <Badge variant="outline">Uploading...</Badge>;
      case "processing":
        return <Badge variant="outline">Processing...</Badge>;
      case "ready":
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium truncate">{pkg.title}</h3>
                {pkg.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {pkg.description}
                  </p>
                )}
              </div>
              {getStatusBadge()}
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="uppercase">{pkg.version.replace("_", " ")}</span>
              {pkg.time_limit && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {pkg.time_limit} min
                </span>
              )}
              {pkg.max_attempts && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {pkg.max_attempts} attempts
                </span>
              )}
              <span>Added {format(new Date(pkg.created_at), "MMM d, yyyy")}</span>
            </div>

            {/* Student attempt status */}
            {statusLabel && (
              <div className="mt-3">
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    statusLabel.color === "green"
                      ? "bg-green-100 text-green-700"
                      : statusLabel.color === "yellow"
                      ? "bg-yellow-100 text-yellow-700"
                      : statusLabel.color === "red"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {statusLabel.color === "green" && <CheckCircle className="h-3 w-3" />}
                  {statusLabel.label}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2">
              {pkg.status === "ready" && onLaunch && (
                <Button size="sm" onClick={() => onLaunch(pkg)}>
                  <Play className="h-4 w-4 mr-1" />
                  Launch
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(pkg)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {pkg.status === "error" && pkg.error_message && (
          <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-600">
            {pkg.error_message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
