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
import { ArrowLeft, Download, FileSpreadsheet, Upload } from "lucide-react";
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

// Grade import field definitions
const GRADE_FIELDS = [
  { name: "student_email", example: "john.smith@email.com" },
  { name: "assignment_name", example: "Module 1 Quiz" },
  { name: "score", example: "85" },
  { name: "max_score", example: "100" },
  { name: "feedback", example: "Good work on the practical section" },
  { name: "submitted_date", example: "2026-01-15" },
  { name: "graded_date", example: "2026-01-16" },
];

type ImportStep = "upload" | "preview" | "results";

interface Course {
  id: string;
  title: string;
}

export default function ImportGradesPage() {
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
  const [createAssignments, setCreateAssignments] = useState(false);

  // Set initial course from URL param
  useEffect(() => {
    const courseParam = searchParams.get("course");
    if (courseParam && courses.some((c) => c.id === courseParam)) {
      setSelectedCourse(courseParam);
    }
  }, [searchParams, courses]);

  // Download CSV template
  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate(GRADE_FIELDS);
    downloadFile(template, "grades-import-template.csv", "text/csv");
  };

  // Validate a single row
  const validateRow = useCallback(
    (row: Record<string, string>, rowNumber: number, duplicateKeys: Map<string, number[]>): ParsedRow => {
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

      // Assignment name required
      if (!row.assignment_name?.trim()) {
        validations.push({
          row: rowNumber,
          field: "assignment_name",
          severity: "error",
          message: "Assignment name is required",
        });
      }

      // Score required and numeric
      if (!row.score?.trim()) {
        validations.push({
          row: rowNumber,
          field: "score",
          severity: "error",
          message: "Score is required",
        });
      } else {
        const score = parseFloat(row.score);
        if (isNaN(score)) {
          validations.push({
            row: rowNumber,
            field: "score",
            severity: "error",
            message: "Score must be a number",
          });
        } else if (score < 0) {
          validations.push({
            row: rowNumber,
            field: "score",
            severity: "error",
            message: "Score cannot be negative",
          });
        }
      }

      // Max score validation (optional but if provided must be numeric)
      if (row.max_score?.trim()) {
        const maxScore = parseFloat(row.max_score);
        if (isNaN(maxScore)) {
          validations.push({
            row: rowNumber,
            field: "max_score",
            severity: "warning",
            message: "Max score should be a number — will default to 100",
          });
        } else if (maxScore <= 0) {
          validations.push({
            row: rowNumber,
            field: "max_score",
            severity: "error",
            message: "Max score must be greater than 0",
          });
        }
      }

      // Check for duplicate student+assignment combinations in file
      const key = `${row.student_email?.toLowerCase().trim()}|${row.assignment_name?.toLowerCase().trim()}`;
      const duplicateRows = duplicateKeys.get(key);
      if (duplicateRows && duplicateRows.length > 1) {
        const otherRows = duplicateRows.filter((r) => r !== rowNumber);
        validations.push({
          row: rowNumber,
          field: "student_email",
          severity: "warning",
          message: `Duplicate grade entry (also on row ${otherRows.join(", ")}) — later row will overwrite`,
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

    // Find duplicate student+assignment combinations
    const duplicateKeys = findDuplicates(
      result.data,
      (row) => `${row.student_email?.toLowerCase().trim()}|${row.assignment_name?.toLowerCase().trim()}`
    );

    // Validate all rows
    const validatedRows = result.data.map((row, index) =>
      validateRow(row, index + 2, duplicateKeys) // +2 because row 1 is header
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
      const grades = rowsToImport.map((row) => ({
        student_email: row.data.student_email?.trim().toLowerCase(),
        assignment_name: row.data.assignment_name?.trim(),
        score: row.data.score?.trim(),
        max_score: row.data.max_score?.trim() || "100",
        feedback: row.data.feedback?.trim() || undefined,
        submitted_date: row.data.submitted_date?.trim() || undefined,
        graded_date: row.data.graded_date?.trim() || undefined,
      }));

      const response = await fetch("/api/admin/import-grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grades,
          tenant_id: tenant.id,
          course_id: selectedCourse,
          create_assignments: createAssignments,
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
        <Link href="/instructor/gradebook">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Gradebook
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-6 w-6" />
          Import Grades
        </h1>
        <p className="text-muted-foreground mt-1">
          Bulk import historical grades from a CSV or Excel file
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
                Download the CSV template and fill in your grade data
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
                  <li>assignment_name (must match existing assignment)</li>
                  <li>score (numeric value)</li>
                </ul>
                <p className="font-medium mt-3">Optional fields:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>max_score (defaults to 100)</li>
                  <li>feedback (text comment)</li>
                  <li>submitted_date (YYYY-MM-DD)</li>
                  <li>graded_date (YYYY-MM-DD)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Course Selection & File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 2: Select Course & Upload</CardTitle>
              <CardDescription>
                Choose the course and upload your grades file
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

              {/* Create missing assignments option */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="createAssignments"
                  checked={createAssignments}
                  onChange={(checked) => setCreateAssignments(checked as boolean)}
                />
                <div>
                  <Label htmlFor="createAssignments" className="cursor-pointer">
                    Auto-create missing assignments
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    If an assignment name doesn&apos;t exist, create it automatically
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
              Review the grades below before importing. Rows with errors will be skipped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportPreview
              data={parsedData}
              headers={headers}
              displayColumns={["student_email", "assignment_name", "score", "max_score"]}
              columnLabels={{
                student_email: "Student",
                assignment_name: "Assignment",
                score: "Score",
                max_score: "Max",
              }}
              onImport={handleImport}
              onCancel={handleReset}
              isImporting={isImporting}
              importButtonText="Import Grades"
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
              entityName="Grades"
              onImportMore={handleReset}
              onNavigate={() => router.push(`/instructor/gradebook?course=${selectedCourse}`)}
              navigateText="View Gradebook"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
