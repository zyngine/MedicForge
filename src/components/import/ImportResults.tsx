"use client";

import { CheckCircle, XCircle, Download, ArrowRight, RotateCcw } from "lucide-react";
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { downloadFile } from "@/lib/utils/import-parser";

export interface ImportResultItem {
  identifier: string; // Email, name, or other identifier
  success: boolean;
  error?: string;
  invited?: boolean; // For user imports
}

interface ImportResultsProps {
  results: ImportResultItem[];
  entityName: string; // "Students", "Questions", etc.
  onImportMore: () => void;
  onNavigate?: () => void;
  navigateText?: string;
}

export function ImportResults({
  results,
  entityName,
  onImportMore,
  onNavigate,
  navigateText,
}: ImportResultsProps) {
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  const invitedCount = results.filter((r) => r.invited).length;

  const downloadErrorReport = () => {
    const failedRows = results.filter((r) => !r.success);
    if (failedRows.length === 0) return;

    const csv = [
      "identifier,error",
      ...failedRows.map((r) => `"${r.identifier}","${r.error || "Unknown error"}"`),
    ].join("\n");

    downloadFile(csv, `${entityName.toLowerCase()}-import-errors.csv`, "text/csv");
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center py-4">
        <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Import Complete</h2>
        <p className="text-muted-foreground mt-2">
          Your {entityName.toLowerCase()} have been processed
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-success">{successCount}</p>
            <p className="text-sm text-muted-foreground">Successfully Imported</p>
          </CardContent>
        </Card>
        {invitedCount > 0 && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-info">{invitedCount}</p>
              <p className="text-sm text-muted-foreground">Invitations Sent</p>
            </CardContent>
          </Card>
        )}
        {failedCount > 0 && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-destructive">{failedCount}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Failed Items Details */}
      {failedCount > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Failed Imports</CardTitle>
              <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                <Download className="h-4 w-4 mr-2" />
                Download Error Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[200px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left py-2 px-3">Identifier</th>
                    <th className="text-left py-2 px-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {results
                    .filter((r) => !r.success)
                    .map((result, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-2 px-3">{result.identifier}</td>
                        <td className="py-2 px-3 text-destructive">
                          <div className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            {result.error || "Unknown error"}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" onClick={onImportMore}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Import More
        </Button>
        {onNavigate && (
          <Button onClick={onNavigate}>
            {navigateText || `Go to ${entityName}`}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
