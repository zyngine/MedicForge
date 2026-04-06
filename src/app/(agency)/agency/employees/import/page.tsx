"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
} from "@/components/ui";
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface _ParsedRow extends Record<string, string> {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  employee_number: string;
  certification_level: string;
  state_cert_number: string;
  nremt_number: string;
  cert_expiration: string;
  hire_date: string;
  department: string;
  position: string;
}

interface RowResult {
  row: number;
  name: string;
  success: boolean;
  error?: string;
}

interface ImportResult {
  imported: number;
  attempted: number;
  results: RowResult[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEMPLATE_HEADERS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "employee_number",
  "certification_level",
  "state_cert_number",
  "nremt_number",
  "cert_expiration",
  "hire_date",
  "department",
  "position",
];

const VALID_CERT_LEVELS = ["EMR", "EMT", "AEMT", "Paramedic"];

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });
}

function validateRow(row: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!row.first_name?.trim()) errors.push("Missing first_name");
  if (!row.last_name?.trim()) errors.push("Missing last_name");
  if (
    row.certification_level &&
    !VALID_CERT_LEVELS.includes(row.certification_level)
  ) {
    errors.push(
      `Invalid certification_level "${row.certification_level}" (must be one of: ${VALID_CERT_LEVELS.join(", ")})`
    );
  }
  return errors;
}

function downloadTemplate() {
  const exampleRow = [
    "Jane",
    "Smith",
    "jane.smith@agency.org",
    "555-0100",
    "EMP-001",
    "EMT",
    "SC-12345",
    "NR-67890",
    "2027-06-30",
    "2023-01-15",
    "Station 1",
    "Field Medic",
  ];
  const csv = [TEMPLATE_HEADERS.join(","), exampleRow.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "employee_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportEmployeesPage() {
  const router = useRouter();
  const { isAgencyAdmin } = useAgencyRole();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parsedRows, setParsedRows] = React.useState<Record<string, string>[]>(
    []
  );
  const [rowErrors, setRowErrors] = React.useState<Record<number, string[]>>(
    {}
  );
  const [isImporting, setIsImporting] = React.useState(false);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(
    null
  );

  // Redirect non-admins
  React.useEffect(() => {
    if (isAgencyAdmin === false) {
      router.replace("/agency/employees");
    }
  }, [isAgencyAdmin, router]);

  // -------------------------------------------------------------------------
  // File handling
  // -------------------------------------------------------------------------

  function processFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a .csv file.");
      return;
    }
    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);

      const errors: Record<number, string[]> = {};
      rows.forEach((row, idx) => {
        const errs = validateRow(row);
        if (errs.length > 0) errors[idx] = errs;
      });
      setRowErrors(errors);
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  // -------------------------------------------------------------------------
  // Import
  // -------------------------------------------------------------------------

  async function handleImport() {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const res = await fetch("/api/agency/employees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employees: parsedRows }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      const data: ImportResult = await res.json();
      setImportResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Import failed";
      setImportResult({
        imported: 0,
        attempted: parsedRows.length,
        results: parsedRows.map((row, i) => ({
          row: i + 1,
          name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || `Row ${i + 1}`,
          success: false,
          error: message,
        })),
      });
    } finally {
      setIsImporting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const hasErrors = Object.keys(rowErrors).length > 0;
  const canImport = parsedRows.length > 0 && !isImporting;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (isAgencyAdmin === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/agency/employees">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Import Employees</h1>
          <p className="text-muted-foreground">
            Bulk-add employees from a CSV file
          </p>
        </div>
      </div>

      {/* Download Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Step 1 — Download Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Download the CSV template, fill in your employee data, then upload
            it below. Required columns:{" "}
            <span className="font-medium text-foreground">
              first_name, last_name
            </span>
            . Valid certification levels:{" "}
            <span className="font-medium text-foreground">
              {VALID_CERT_LEVELS.join(", ")}
            </span>
            .
          </p>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template CSV
          </Button>
        </CardContent>
      </Card>

      {/* CSV Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Step 2 — Upload CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            {fileName ? (
              <div className="space-y-1">
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {parsedRows.length} data row
                  {parsedRows.length !== 1 ? "s" : ""} parsed
                </p>
                <p className="text-xs text-muted-foreground">
                  Click or drop to replace
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-medium">Drop your CSV here</p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Preview table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Preview — {parsedRows.length} row
                  {parsedRows.length !== 1 ? "s" : ""}
                </p>
                {hasErrors && (
                  <Badge variant="destructive">
                    {Object.keys(rowErrors).length} row
                    {Object.keys(rowErrors).length !== 1 ? "s" : ""} with errors
                  </Badge>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                {/* Preview header */}
                <div className="flex items-center gap-4 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                  <div className="w-8">#</div>
                  <div className="w-32">First Name</div>
                  <div className="w-32">Last Name</div>
                  <div className="w-40">Email</div>
                  <div className="w-24">Cert Level</div>
                  <div className="flex-1">Status</div>
                </div>

                {/* Preview rows (cap at 50 for performance) */}
                {parsedRows.slice(0, 50).map((row, idx) => {
                  const errs = rowErrors[idx];
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-4 p-3 border-b last:border-b-0 text-sm ${
                        errs ? "bg-destructive/5" : ""
                      }`}
                    >
                      <div className="w-8 text-muted-foreground">{idx + 1}</div>
                      <div className="w-32 truncate">
                        {row.first_name || (
                          <span className="text-destructive italic">
                            missing
                          </span>
                        )}
                      </div>
                      <div className="w-32 truncate">
                        {row.last_name || (
                          <span className="text-destructive italic">
                            missing
                          </span>
                        )}
                      </div>
                      <div className="w-40 truncate text-muted-foreground">
                        {row.email || "—"}
                      </div>
                      <div className="w-24">
                        {row.certification_level ? (
                          VALID_CERT_LEVELS.includes(row.certification_level) ? (
                            <Badge variant="outline">
                              {row.certification_level}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              {row.certification_level}
                            </Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
                      <div className="flex-1">
                        {errs ? (
                          <span className="text-destructive text-xs">
                            {errs.join("; ")}
                          </span>
                        ) : (
                          <span className="text-success text-xs flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            OK
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {parsedRows.length > 50 && (
                  <div className="p-3 text-center text-sm text-muted-foreground bg-muted/30">
                    Showing first 50 of {parsedRows.length} rows
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Button */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Step 3 — Run Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasErrors && (
            <p className="text-sm text-destructive">
              Some rows have validation errors. They will be skipped during
              import. Fix the CSV and re-upload to include them.
            </p>
          )}
          <Button onClick={handleImport} disabled={!canImport}>
            {isImporting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Importing…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {parsedRows.length > 0 ? `${parsedRows.length} Employee${parsedRows.length !== 1 ? "s" : ""}` : "Employees"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.imported === importResult.attempted ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary counts */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-success">
                  {importResult.imported}
                </p>
                <p className="text-xs text-muted-foreground">Imported</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {importResult.attempted}
                </p>
                <p className="text-xs text-muted-foreground">Attempted</p>
              </div>
              {importResult.attempted - importResult.imported > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">
                    {importResult.attempted - importResult.imported}
                  </p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              )}
            </div>

            {/* Per-row results */}
            <div className="border rounded-lg overflow-hidden">
              {importResult.results.map((result) => (
                <div
                  key={result.row}
                  className="flex items-center gap-4 p-3 border-b last:border-b-0 text-sm"
                >
                  <div className="w-8 text-muted-foreground">{result.row}</div>
                  <div className="flex-1 font-medium">{result.name}</div>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <Badge
                        variant="outline"
                        className="text-success gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Imported
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                  </div>
                  {result.error && (
                    <div className="text-xs text-destructive max-w-xs truncate">
                      {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {importResult.imported > 0 && (
              <Button asChild variant="outline">
                <Link href="/agency/employees">View Employee Directory</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
