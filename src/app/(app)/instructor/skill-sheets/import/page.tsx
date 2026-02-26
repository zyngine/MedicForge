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
  Checkbox,
  Label,
} from "@/components/ui";
import { ArrowLeft, Download, FileSpreadsheet, ClipboardCheck } from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useInstructorCourses } from "@/lib/hooks/use-courses";
import { FileDropzone, ImportPreview, ImportResults, type ImportResultItem } from "@/components/import";
import {
  parseFile,
  isValidEmail,
  findDuplicates,
  generateCSVTemplate,
  downloadFile,
  type ParsedRow,
  type ValidationResult,
} from "@/lib/utils/import-parser";

// Skills import field definitions
const SKILL_FIELDS = [
  { name: "student_email", example: "john.smith@email.com" },
  { name: "skill_name", example: "Patient Assessment" },
  { name: "status", example: "passed" },
  { name: "attempt_number", example: "1" },
  { name: "evaluated_date", example: "2026-01-15" },
  { name: "feedback", example: "Excellent performance on airway management" },
  { name: "notes", example: "Completed during clinical rotation" },
];

const VALID_STATUSES = ["passed", "failed", "needs_practice"];

type ImportStep = "upload" | "preview" | "results";

export default function ImportSkillsPage() {
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
  const [createSkills, setCreateSkills] = useState(false);

  // Set initial course from URL param
  useEffect(() => {
    const courseParam = searchParams.get("course");
    if (courseParam && courses.some((c) => c.id === courseParam)) {
      setSelectedCourse(courseParam);
    }
  }, [searchParams, courses]);

  // Download CSV template
  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate(SKILL_FIELDS);
    downloadFile(template, "skills-import-template.csv", "text/csv");
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

      // Skill name required
      if (!row.skill_name?.trim()) {
        validations.push({
          row: rowNumber,
          field: "skill_name",
          severity: "error",
          message: "Skill name is required",
        });
      }

      // Status required and valid
      if (!row.status?.trim()) {
        validations.push({
          row: rowNumber,
          field: "status",
          severity: "error",
          message: "Status is required",
        });
      } else if (!VALID_STATUSES.includes(row.status.toLowerCase().trim())) {
        validations.push({
          row: rowNumber,
          field: "status",
          severity: "error",
          message: `Invalid status. Use: ${VALID_STATUSES.join(", ")}`,
        });
      }

      // Attempt number validation (optional but must be numeric if provided)
      if (row.attempt_number?.trim()) {
        const attemptNum = parseInt(row.attempt_number);
        if (isNaN(attemptNum) || attemptNum < 1) {
          validations.push({
            row: rowNumber,
            field: "attempt_number",
            severity: "warning",
            message: "Attempt number should be a positive integer — will default to 1",
          });
        }
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
      const skills = rowsToImport.map((row) => ({
        student_email: row.data.student_email?.trim().toLowerCase(),
        skill_name: row.data.skill_name?.trim(),
        status: row.data.status?.toLowerCase().trim(),
        attempt_number: row.data.attempt_number?.trim() || "1",
        evaluated_date: row.data.evaluated_date?.trim() || undefined,
        feedback: row.data.feedback?.trim() || undefined,
        notes: row.data.notes?.trim() || undefined,
      }));

      const response = await fetch("/api/admin/import-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills,
          tenant_id: tenant.id,
          course_id: selectedCourse,
          create_skills: createSkills,
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
        <Link href="/instructor/skill-sheets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Skill Sheets
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6" />
          Import Skills Competencies
        </h1>
        <p className="text-muted-foreground mt-1">
          Bulk import historical skill competency records from a CSV or Excel file
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
                Download the CSV template and fill in your competency data
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
                  <li>skill_name (must match existing skill)</li>
                  <li>status (passed, failed, or needs_practice)</li>
                </ul>
                <p className="font-medium mt-3">Optional fields:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>attempt_number (defaults to 1)</li>
                  <li>evaluated_date (YYYY-MM-DD)</li>
                  <li>feedback (evaluator feedback)</li>
                  <li>notes (additional notes)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Course Selection & File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 2: Select Course & Upload</CardTitle>
              <CardDescription>
                Choose the course and upload your skills file
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

              {/* Create missing skills option */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="createSkills"
                  checked={createSkills}
                  onChange={(checked) => setCreateSkills(checked as boolean)}
                />
                <div>
                  <Label htmlFor="createSkills" className="cursor-pointer">
                    Auto-create missing skills
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    If a skill name doesn&apos;t exist, create it automatically
                  </p>
                </div>
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
              Review the skill records below before importing. Rows with errors will be skipped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportPreview
              data={parsedData}
              headers={headers}
              displayColumns={["student_email", "skill_name", "status", "attempt_number"]}
              columnLabels={{
                student_email: "Student",
                skill_name: "Skill",
                status: "Status",
                attempt_number: "Attempt",
              }}
              onImport={handleImport}
              onCancel={handleReset}
              isImporting={isImporting}
              importButtonText="Import Skills"
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
              entityName="Skill Records"
              onImportMore={handleReset}
              onNavigate={() => router.push("/instructor/skill-sheets")}
              navigateText="View Skill Sheets"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
