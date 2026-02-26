"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Alert,
} from "@/components/ui";
import { ArrowLeft, Download, FileSpreadsheet, Users } from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { FileDropzone, ImportPreview, ImportResults, type ImportResultItem } from "@/components/import";
import {
  parseFile,
  isValidEmail,
  parseDate,
  formatDateISO,
  findDuplicates,
  generateCSVTemplate,
  downloadFile,
  type ParsedRow,
  type ValidationResult,
} from "@/lib/utils/import-parser";

// Student import field definitions
const STUDENT_FIELDS = [
  { name: "first_name", required: true, example: "John" },
  { name: "last_name", required: true, example: "Smith" },
  { name: "email", required: true, example: "john.smith@email.com" },
  { name: "phone", required: false, example: "717-555-0101" },
  { name: "certification_level", required: false, example: "EMT" },
  { name: "student_id", required: false, example: "STU-001" },
  { name: "cohort", required: false, example: "Fall 2026 EMT" },
  { name: "start_date", required: false, example: "2026-01-15" },
  { name: "expected_graduation", required: false, example: "2026-06-15" },
];

const VALID_CERT_LEVELS = ["EMR", "EMT", "AEMT", "Paramedic", "emr", "emt", "aemt", "paramedic"];

type ImportStep = "upload" | "preview" | "results";

export default function ImportStudentsPage() {
  const router = useRouter();
  const { tenant } = useTenant();

  const [step, setStep] = useState<ImportStep>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResultItem[]>([]);

  // Download CSV template
  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate(STUDENT_FIELDS);
    downloadFile(template, "student-import-template.csv", "text/csv");
  };

  // Validate a single row
  const validateRow = useCallback(
    (row: Record<string, string>, rowNumber: number, duplicateEmails: Map<string, number[]>): ParsedRow => {
      const validations: ValidationResult[] = [];

      // Required field checks
      if (!row.first_name?.trim()) {
        validations.push({
          row: rowNumber,
          field: "first_name",
          severity: "error",
          message: "First name is required",
        });
      }

      if (!row.last_name?.trim()) {
        validations.push({
          row: rowNumber,
          field: "last_name",
          severity: "error",
          message: "Last name is required",
        });
      }

      if (!row.email?.trim()) {
        validations.push({
          row: rowNumber,
          field: "email",
          severity: "error",
          message: "Email is required",
        });
      } else if (!isValidEmail(row.email.trim())) {
        validations.push({
          row: rowNumber,
          field: "email",
          severity: "error",
          message: "Invalid email format",
        });
      } else {
        // Check for duplicates in file
        const emailLower = row.email.trim().toLowerCase();
        const duplicateRows = duplicateEmails.get(emailLower);
        if (duplicateRows && duplicateRows.length > 1) {
          const otherRows = duplicateRows.filter((r) => r !== rowNumber);
          validations.push({
            row: rowNumber,
            field: "email",
            severity: "error",
            message: `Duplicate email in file (also on row ${otherRows.join(", ")})`,
          });
        }
      }

      // Certification level validation
      if (row.certification_level?.trim() && !VALID_CERT_LEVELS.includes(row.certification_level.trim())) {
        validations.push({
          row: rowNumber,
          field: "certification_level",
          severity: "warning",
          message: `Unknown certification level "${row.certification_level}" — will import as blank`,
        });
      }

      // Date validations
      if (row.start_date?.trim() && !parseDate(row.start_date)) {
        validations.push({
          row: rowNumber,
          field: "start_date",
          severity: "warning",
          message: "Could not parse date — will import as blank",
        });
      }

      if (row.expected_graduation?.trim() && !parseDate(row.expected_graduation)) {
        validations.push({
          row: rowNumber,
          field: "expected_graduation",
          severity: "warning",
          message: "Could not parse date — will import as blank",
        });
      }

      const hasErrors = validations.some((v) => v.severity === "error");
      const hasWarnings = validations.some((v) => v.severity === "warning");

      return {
        rowNumber,
        data: row,
        validations,
        isValid: !hasErrors,
        hasWarnings,
      };
    },
    []
  );

  // Handle file selection and parsing
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);

    const result = await parseFile(file);

    if (result.error) {
      setParseError(result.error);
      return;
    }

    if (result.data.length === 0) {
      setParseError("No data rows found in file");
      return;
    }

    // Find duplicate emails
    const duplicateEmails = findDuplicates(result.data, "email");

    // Validate all rows
    const validatedRows = result.data.map((row, index) =>
      validateRow(row, index + 2, duplicateEmails) // +2 because row 1 is header
    );

    setHeaders(result.headers);
    setParsedData(validatedRows);
    setStep("preview");
  };

  // Handle import
  const handleImport = async (skipWarnings: boolean) => {
    if (!tenant?.id) return;

    setIsImporting(true);

    try {
      // Filter rows to import
      const rowsToImport = parsedData.filter((row) => {
        if (!row.isValid) return false;
        if (skipWarnings && row.hasWarnings) return false;
        return true;
      });

      // Transform to API format
      const students = rowsToImport.map((row) => ({
        first_name: row.data.first_name?.trim(),
        last_name: row.data.last_name?.trim(),
        email: row.data.email?.trim().toLowerCase(),
        phone: row.data.phone?.trim() || undefined,
        certification_level: VALID_CERT_LEVELS.includes(row.data.certification_level?.trim() || "")
          ? row.data.certification_level?.trim()
          : undefined,
        student_id: row.data.student_id?.trim() || undefined,
        cohort: row.data.cohort?.trim() || undefined,
        start_date: row.data.start_date ? formatDateISO(parseDate(row.data.start_date)!) : undefined,
        expected_graduation: row.data.expected_graduation
          ? formatDateISO(parseDate(row.data.expected_graduation)!)
          : undefined,
      }));

      const response = await fetch("/api/admin/import-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students, tenant_id: tenant.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import failed");
      }

      setImportResults(result.results);
      setStep("results");
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  // Reset for new import
  const handleReset = () => {
    setStep("upload");
    setSelectedFile(null);
    setParsedData([]);
    setHeaders([]);
    setParseError(null);
    setImportResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Import Students
        </h1>
        <p className="text-muted-foreground mt-1">
          Bulk import students from a CSV or Excel file
        </p>
      </div>

      {parseError && (
        <Alert variant="error" onClose={() => setParseError(null)}>
          {parseError}
        </Alert>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Step 1: Download Template
              </CardTitle>
              <CardDescription>
                Download the CSV template and fill in your student data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleDownloadTemplate} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>

              <div className="text-sm space-y-2">
                <p className="font-medium">Required fields:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>first_name</li>
                  <li>last_name</li>
                  <li>email (must be unique)</li>
                </ul>
                <p className="font-medium mt-3">Optional fields:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>phone</li>
                  <li>certification_level (EMR, EMT, AEMT, Paramedic)</li>
                  <li>student_id</li>
                  <li>cohort</li>
                  <li>start_date (YYYY-MM-DD)</li>
                  <li>expected_graduation (YYYY-MM-DD)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 2: Upload File</CardTitle>
              <CardDescription>
                Upload your completed CSV or Excel file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropzone
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onClear={handleReset}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 3: Review & Import</CardTitle>
            <CardDescription>
              Review the data below before importing. Rows with errors will be skipped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportPreview
              data={parsedData}
              headers={headers}
              displayColumns={["first_name", "last_name", "email", "certification_level"]}
              columnLabels={{
                first_name: "First Name",
                last_name: "Last Name",
                email: "Email",
                certification_level: "Cert Level",
              }}
              onImport={handleImport}
              onCancel={handleReset}
              isImporting={isImporting}
              importButtonText="Import"
            />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Results */}
      {step === "results" && (
        <Card>
          <CardContent className="pt-6">
            <ImportResults
              results={importResults}
              entityName="Students"
              onImportMore={handleReset}
              onNavigate={() => router.push("/admin/users")}
              navigateText="Go to Users"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
