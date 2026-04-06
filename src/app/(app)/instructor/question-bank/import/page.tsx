"use client";

import { useState, useCallback, useEffect } from "react";
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
  Select,
  Spinner,
} from "@/components/ui";
import { ArrowLeft, Download, FileSpreadsheet, HelpCircle } from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { createClient } from "@/lib/supabase/client";
import { FileDropzone, ImportPreview, ImportResults, type ImportResultItem } from "@/components/import";
import {
  parseFile,
  generateCSVTemplate,
  downloadFile,
  type ParsedRow,
  type ValidationResult,
} from "@/lib/utils/import-parser";

// Question import field definitions
const QUESTION_FIELDS = [
  { name: "question_text", example: "What is the normal respiratory rate for an adult?" },
  { name: "question_type", example: "multiple_choice" },
  { name: "option_a", example: "8-12" },
  { name: "option_b", example: "12-20" },
  { name: "option_c", example: "20-30" },
  { name: "option_d", example: "30-40" },
  { name: "option_e", example: "" },
  { name: "correct_answer", example: "B" },
  { name: "explanation", example: "Normal adult respiratory rate is 12-20 breaths per minute." },
  { name: "category", example: "Medical" },
  { name: "difficulty", example: "easy" },
  { name: "points", example: "1" },
  { name: "source", example: "" },
];

const VALID_QUESTION_TYPES = ["multiple_choice", "true_false", "multi_select"];
const VALID_DIFFICULTIES = ["easy", "medium", "hard", "expert"];

type ImportStep = "upload" | "preview" | "results";

interface Category {
  id: string;
  name: string;
}

export default function ImportQuestionsPage() {
  const router = useRouter();
  const { tenant } = useTenant();
  const supabase = createClient();

  const [step, setStep] = useState<ImportStep>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResultItem[]>([]);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      if (!tenant?.id) return;

      // Using type assertion because question_bank_categories may not be in the client types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("question_bank_categories")
        .select("id, name")
        .or(`tenant_id.eq.${tenant.id},tenant_id.is.null`)
        .eq("is_active", true)
        .order("name");

      setCategories((data as Category[]) || []);
      setLoadingCategories(false);
    };

    loadCategories();
  }, [tenant?.id, supabase]);

  // Download CSV template
  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate(QUESTION_FIELDS);
    downloadFile(template, "question-import-template.csv", "text/csv");
  };

  // Validate a single row
  const validateRow = useCallback(
    (row: Record<string, string>, rowNumber: number): ParsedRow => {
      const validations: ValidationResult[] = [];

      // Question text required
      if (!row.question_text?.trim()) {
        validations.push({
          row: rowNumber,
          field: "question_text",
          severity: "error",
          message: "Question text is required",
        });
      }

      // Question type required and valid
      const questionType = row.question_type?.toLowerCase().trim();
      if (!questionType) {
        validations.push({
          row: rowNumber,
          field: "question_type",
          severity: "error",
          message: "Question type is required",
        });
      } else if (!VALID_QUESTION_TYPES.includes(questionType)) {
        validations.push({
          row: rowNumber,
          field: "question_type",
          severity: "error",
          message: `Invalid question type. Use: ${VALID_QUESTION_TYPES.join(", ")}`,
        });
      }

      // Options required for multiple choice
      if (questionType === "multiple_choice" || questionType === "multi_select") {
        if (!row.option_a?.trim() || !row.option_b?.trim()) {
          validations.push({
            row: rowNumber,
            field: "options",
            severity: "error",
            message: "Multiple choice requires at least option_a and option_b",
          });
        }
      }

      // Correct answer required
      if (!row.correct_answer?.trim()) {
        validations.push({
          row: rowNumber,
          field: "correct_answer",
          severity: "error",
          message: "Correct answer is required",
        });
      } else {
        // Validate correct answer format
        const answer = row.correct_answer.toUpperCase().trim();

        if (questionType === "true_false") {
          if (!["TRUE", "FALSE"].includes(answer)) {
            validations.push({
              row: rowNumber,
              field: "correct_answer",
              severity: "error",
              message: "True/false answer must be 'True' or 'False'",
            });
          }
        } else if (questionType === "multi_select") {
          const answers = answer.split(",").map((a) => a.trim());
          const validOptions = ["A", "B", "C", "D", "E"];
          const invalidAnswers = answers.filter((a) => !validOptions.includes(a));
          if (invalidAnswers.length > 0) {
            validations.push({
              row: rowNumber,
              field: "correct_answer",
              severity: "error",
              message: `Invalid answer options: ${invalidAnswers.join(", ")}`,
            });
          }
        } else if (questionType === "multiple_choice") {
          const validOptions = ["A", "B", "C", "D", "E"];
          if (!validOptions.includes(answer)) {
            validations.push({
              row: rowNumber,
              field: "correct_answer",
              severity: "error",
              message: `Correct answer '${answer}' is not a valid option (A-E)`,
            });
          }
        }
      }

      // Difficulty validation
      if (row.difficulty?.trim() && !VALID_DIFFICULTIES.includes(row.difficulty.toLowerCase().trim())) {
        validations.push({
          row: rowNumber,
          field: "difficulty",
          severity: "warning",
          message: `Unknown difficulty — will default to 'medium'`,
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
      validateRow(row, index + 2)
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
      const rowsToImport = parsedData.filter((row) => {
        if (!row.isValid) return false;
        if (skipWarnings && row.hasWarnings) return false;
        return true;
      });

      const questions = rowsToImport.map((row) => ({
        question_text: row.data.question_text?.trim(),
        question_type: row.data.question_type?.toLowerCase().trim(),
        option_a: row.data.option_a?.trim(),
        option_b: row.data.option_b?.trim(),
        option_c: row.data.option_c?.trim(),
        option_d: row.data.option_d?.trim(),
        option_e: row.data.option_e?.trim(),
        correct_answer: row.data.correct_answer?.trim(),
        explanation: row.data.explanation?.trim(),
        category: row.data.category?.trim(),
        difficulty: row.data.difficulty?.trim(),
        points: row.data.points?.trim(),
        source: row.data.source?.trim(),
      }));

      const response = await fetch("/api/admin/import-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions,
          tenant_id: tenant.id,
          category_id: selectedCategory || null,
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

  // Reset
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
        <Link href="/instructor/question-bank">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Question Bank
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          Import Questions
        </h1>
        <p className="text-muted-foreground mt-1">
          Bulk import questions from a CSV or Excel file
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
                Download the CSV template with example questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleDownloadTemplate} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>

              <div className="text-sm space-y-2">
                <p className="font-medium">Question Types:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li><code>multiple_choice</code> - Single correct answer (A, B, C, D, or E)</li>
                  <li><code>multi_select</code> - Multiple correct answers (e.g., "A,C,D")</li>
                  <li><code>true_false</code> - True or False</li>
                </ul>
                <p className="font-medium mt-3">Difficulty Levels:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>easy, medium, hard, expert</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 2: Upload File</CardTitle>
              <CardDescription>
                Select a category (optional) and upload your file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingCategories ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category (Optional)</label>
                  <Select
                    options={[
                      { value: "", label: "No category" },
                      ...categories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                  />
                </div>
              )}

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
              Review the questions below before importing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportPreview
              data={parsedData}
              headers={headers}
              displayColumns={["question_text", "question_type", "correct_answer", "difficulty"]}
              columnLabels={{
                question_text: "Question",
                question_type: "Type",
                correct_answer: "Answer",
                difficulty: "Difficulty",
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
              entityName="Questions"
              onImportMore={handleReset}
              onNavigate={() => router.push("/instructor/question-bank")}
              navigateText="Go to Question Bank"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
