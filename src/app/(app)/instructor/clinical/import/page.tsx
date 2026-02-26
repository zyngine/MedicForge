"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Alert,
  Select,
  Spinner,
  Label,
} from "@/components/ui";
import { ArrowLeft, Download, FileSpreadsheet, Clock } from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useInstructorCourses } from "@/lib/hooks/use-courses";
import { FileDropzone, ImportPreview, ImportResults, type ImportResultItem } from "@/components/import";
import {
  parseFile,
  isValidEmail,
  generateCSVTemplate,
  downloadFile,
  type ParsedRow,
  type ValidationResult,
} from "@/lib/utils/import-parser";

// Clinical hours import field definitions
const CLINICAL_FIELDS = [
  { name: "student_email", example: "john.smith@email.com" },
  { name: "date", example: "2026-01-15" },
  { name: "hours", example: "8" },
  { name: "site_name", example: "Memorial Hospital" },
  { name: "site_type", example: "hospital" },
  { name: "supervisor_name", example: "Dr. Jane Smith" },
  { name: "supervisor_credentials", example: "MD, Paramedic" },
  { name: "was_team_lead", example: "false" },
  { name: "notes", example: "Completed IV training" },
  { name: "verification_status", example: "verified" },
];

const VALID_SITE_TYPES = ["ambulance", "hospital", "clinic", "fire_department", "rescue_squad", "other"];
const VALID_STATUSES = ["pending", "verified", "rejected"];

type ImportStep = "upload" | "preview" | "results";

export default function ImportClinicalHoursPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = useTenant();
  const { data: courses = [], isLoading: coursesLoading } = useInstructorCourses();

  const [step, setStep] = useState<ImportStep>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResultItem[]>([]);

  // Course selection
  const [selectedCourse, setSelectedCourse] = useState<string>("");

  // Set initial course from URL param
  useEffect(() => {
    const courseParam = searchParams.get("course");
    if (courseParam && courses.some((c) => c.id === courseParam)) {
      setSelectedCourse(courseParam);
    }
  }, [searchParams, courses]);

  // Download CSV template
  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate(CLINICAL_FIELDS);
    downloadFile(template, "clinical-hours-import-template.csv", "text/csv");
  };

  // Validate a single row
  const validateRow = useCallback(
    (row: Record<string, string>, rowNumber: number): ParsedRow => {
      const validations: ValidationResult[] = [];

      // Email required and valid
      if (!row.student_email?.trim()) {
        validations.push({
          row: rowNumber,
          field: "student_email",
          severity: "error",
          message: "Student email is required",
        });
      } else if (!isValidEmail(row.student_email.trim())) {
        validations.push({
          row: rowNumber,
          field: "student_email",
          severity: "error",
          message: "Invalid email format",
        });
      }

      // Date required and valid format
      if (!row.date?.trim()) {
        validations.push({
          row: rowNumber,
          field: "date",
          severity: "error",
          message: "Date is required",
        });
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(row.date.trim())) {
          validations.push({
            row: rowNumber,
            field: "date",
            severity: "error",
            message: "Invalid date format. Use YYYY-MM-DD",
          });
        }
      }

      // Hours required and numeric
      if (!row.hours?.trim()) {
        validations.push({
          row: rowNumber,
          field: "hours",
          severity: "error",
          message: "Hours is required",
        });
      } else {
        const hours = parseFloat(row.hours);
        if (isNaN(hours)) {
          validations.push({
            row: rowNumber,
            field: "hours",
            severity: "error",
            message: "Hours must be a number",
          });
        } else if (hours < 0) {
          validations.push({
            row: rowNumber,
            field: "hours",
            severity: "error",
            message: "Hours cannot be negative",
          });
        } else if (hours > 24) {
          validations.push({
            row: rowNumber,
            field: "hours",
            severity: "warning",
            message: "Hours exceeds 24 — verify this is correct",
          });
        }
      }

      // Site type validation (optional but should be valid if provided)
      if (row.site_type?.trim() && !VALID_SITE_TYPES.includes(row.site_type.toLowerCase().trim())) {
        validations.push({
          row: rowNumber,
          field: "site_type",
          severity: "warning",
          message: `Unknown site type — use: ${VALID_SITE_TYPES.join(", ")}`,
        });
      }

      // Verification status validation (optional but should be valid if provided)
      if (row.verification_status?.trim() && !VALID_STATUSES.includes(row.verification_status.toLowerCase().trim())) {
        validations.push({
          row: rowNumber,
          field: "verification_status",
          severity: "warning",
          message: `Unknown status — will default to 'pending'`,
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

    // Validate all rows
    const validatedRows = result.data.map((row, index) =>
      validateRow(row, index + 2) // +2 because row 1 is header
    );

    setHeaders(result.headers);
    setParsedData(validatedRows);
    setStep("preview");
  };

  // Handle import
  const handleImport = async (skipWarnings: boolean) => {
    if (!tenant?.id || !selectedCourse) return;

    setIsImporting(true);

    try {
      // Filter rows to import
      const rowsToImport = parsedData.filter((row) => {
        if (!row.isValid) return false;
        if (skipWarnings && row.hasWarnings) return false;
        return true;
      });

      // Transform to API format
      const clinical_hours = rowsToImport.map((row) => ({
        student_email: row.data.student_email?.trim().toLowerCase(),
        date: row.data.date?.trim(),
        hours: row.data.hours?.trim(),
        site_name: row.data.site_name?.trim() || undefined,
        site_type: row.data.site_type?.trim() || undefined,
        supervisor_name: row.data.supervisor_name?.trim() || undefined,
        supervisor_credentials: row.data.supervisor_credentials?.trim() || undefined,
        was_team_lead: row.data.was_team_lead?.trim() || undefined,
        notes: row.data.notes?.trim() || undefined,
        verification_status: row.data.verification_status?.trim() || undefined,
      }));

      const response = await fetch("/api/admin/import-clinical-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinical_hours,
          tenant_id: tenant.id,
          course_id: selectedCourse,
        }),
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

  if (coursesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/instructor/clinical">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clinical
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Import Clinical Hours
        </h1>
        <p className="text-muted-foreground mt-1">
          Bulk import historical clinical hours from a CSV or Excel file
        </p>
      </div>

      {parseError && (
        <Alert variant="error" onClose={() => setParseError(null)}>
          {parseError}
        </Alert>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Step 1: Download Template
              </CardTitle>
              <CardDescription>
                Download the CSV template and fill in your clinical hours data
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
                  <li>student_email (must match enrolled student)</li>
                  <li>date (YYYY-MM-DD format)</li>
                  <li>hours (numeric value)</li>
                </ul>
                <p className="font-medium mt-3">Optional fields:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>site_name</li>
                  <li>site_type (ambulance, hospital, clinic, fire_department, rescue_squad, other)</li>
                  <li>supervisor_name</li>
                  <li>supervisor_credentials</li>
                  <li>was_team_lead (true/false)</li>
                  <li>notes</li>
                  <li>verification_status (pending, verified, rejected)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Course Selection & File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 2: Select Course & Upload</CardTitle>
              <CardDescription>
                Choose the course and upload your clinical hours file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Course Selection */}
              <div className="space-y-2">
                <Label>Course *</Label>
                {courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No courses found. Create a course first.
                  </p>
                ) : (
                  <Select
                    options={courses.map((c) => ({ value: c.id, label: c.title }))}
                    value={selectedCourse}
                    onChange={setSelectedCourse}
                    placeholder="Select a course..."
                  />
                )}
              </div>

              {/* File Upload */}
              {selectedCourse ? (
                <FileDropzone
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  onClear={handleReset}
                />
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  Select a course above to enable file upload
                </div>
              )}
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
              Review the clinical hours below before importing. Rows with errors will be skipped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportPreview
              data={parsedData}
              headers={headers}
              displayColumns={["student_email", "date", "hours", "site_name"]}
              columnLabels={{
                student_email: "Student",
                date: "Date",
                hours: "Hours",
                site_name: "Site",
              }}
              onImport={handleImport}
              onCancel={handleReset}
              isImporting={isImporting}
              importButtonText="Import Hours"
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
              entityName="Clinical Hours"
              onImportMore={handleReset}
              onNavigate={() => router.push("/instructor/clinical")}
              navigateText="View Clinical Logs"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
