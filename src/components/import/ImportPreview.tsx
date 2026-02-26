"use client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import type { ParsedRow, ValidationSeverity } from "@/lib/utils/import-parser";

interface ImportPreviewProps {
  data: ParsedRow[];
  headers: string[];
  displayColumns?: string[]; // Which columns to show in preview
  columnLabels?: Record<string, string>; // Custom labels for columns
  onImport: (skipWarnings: boolean) => void;
  onCancel: () => void;
  isImporting: boolean;
  importButtonText?: string;
}

export function ImportPreview({
  data,
  headers,
  displayColumns,
  columnLabels = {},
  onImport,
  onCancel,
  isImporting,
  importButtonText = "Import",
}: ImportPreviewProps) {
  const [skipWarnings, setSkipWarnings] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const columnsToShow = displayColumns || headers.slice(0, 4);

  const validCount = data.filter((r) => r.isValid && !r.hasWarnings).length;
  const warningCount = data.filter((r) => r.isValid && r.hasWarnings).length;
  const errorCount = data.filter((r) => !r.isValid).length;

  const importableCount = skipWarnings ? validCount : validCount + warningCount;

  const toggleRow = (rowNumber: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowNumber)) {
      newExpanded.delete(rowNumber);
    } else {
      newExpanded.add(rowNumber);
    }
    setExpandedRows(newExpanded);
  };

  const getRowStatus = (row: ParsedRow): { icon: React.ReactNode; color: string; label: string } => {
    if (!row.isValid) {
      return {
        icon: <XCircle className="h-4 w-4" />,
        color: "text-destructive",
        label: "Error",
      };
    }
    if (row.hasWarnings) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        color: "text-warning",
        label: "Warning",
      };
    }
    return {
      icon: <CheckCircle className="h-4 w-4" />,
      color: "text-success",
      label: "Valid",
    };
  };

  const getSeverityIcon = (severity: ValidationSeverity) => {
    switch (severity) {
      case "error":
        return <XCircle className="h-3 w-3 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-3 w-3 text-warning" />;
      case "info":
        return <Info className="h-3 w-3 text-info" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="outline" className="text-sm">
          {data.length} rows found
        </Badge>
        {validCount > 0 && (
          <Badge variant="success" className="text-sm">
            <CheckCircle className="h-3 w-3 mr-1" />
            {validCount} valid
          </Badge>
        )}
        {warningCount > 0 && (
          <Badge variant="warning" className="text-sm">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {warningCount} warnings
          </Badge>
        )}
        {errorCount > 0 && (
          <Badge variant="destructive" className="text-sm">
            <XCircle className="h-3 w-3 mr-1" />
            {errorCount} errors
          </Badge>
        )}
      </div>

      {/* Preview Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left py-2 px-3 font-medium w-16">Row</th>
                  {columnsToShow.map((col) => (
                    <th key={col} className="text-left py-2 px-3 font-medium">
                      {columnLabels[col] || col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </th>
                  ))}
                  <th className="text-left py-2 px-3 font-medium w-24">Status</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const status = getRowStatus(row);
                  const isExpanded = expandedRows.has(row.rowNumber);
                  const hasDetails = row.validations.length > 0;

                  return (
                    <>
                      <tr
                        key={row.rowNumber}
                        className={`border-t hover:bg-muted/50 ${hasDetails ? "cursor-pointer" : ""}`}
                        onClick={() => hasDetails && toggleRow(row.rowNumber)}
                      >
                        <td className="py-2 px-3 text-muted-foreground">{row.rowNumber}</td>
                        {columnsToShow.map((col) => (
                          <td key={col} className="py-2 px-3 truncate max-w-[200px]">
                            {row.data[col] || "—"}
                          </td>
                        ))}
                        <td className={`py-2 px-3 ${status.color}`}>
                          <div className="flex items-center gap-1">
                            {status.icon}
                            <span className="text-xs">{status.label}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {hasDetails && (
                            isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasDetails && (
                        <tr key={`${row.rowNumber}-details`} className="bg-muted/30">
                          <td colSpan={columnsToShow.length + 3} className="py-2 px-3">
                            <div className="space-y-1 text-xs">
                              {row.validations.map((v, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  {getSeverityIcon(v.severity)}
                                  <span className="font-medium">{v.field}:</span>
                                  <span>{v.message}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      {warningCount > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={skipWarnings}
            onChange={(e) => setSkipWarnings(e.target.checked)}
            className="rounded border-input"
          />
          Skip rows with warnings (import only {validCount} fully valid rows)
        </label>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isImporting}>
          Cancel
        </Button>
        <Button
          onClick={() => onImport(skipWarnings)}
          disabled={isImporting || importableCount === 0}
          isLoading={isImporting}
        >
          {importButtonText} {importableCount} Records
        </Button>
      </div>
    </div>
  );
}
