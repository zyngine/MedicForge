"use client";

import { useState } from "react";
import { Button, Alert } from "@/components/ui";
import { Upload, FileText, Download, CheckCircle, AlertCircle } from "lucide-react";
import type {
  QuestionBankCategory,
  CreateQuestionInput,
} from "@/lib/hooks/use-question-bank";
import { useQuestionBank } from "@/lib/hooks/use-question-bank";

interface QuestionImporterProps {
  categories: QuestionBankCategory[];
  onImport: () => Promise<void>;
  onCancel: () => void;
  /** Default certification level to use when CSV row has none */
  defaultCertificationLevel?: string;
  /** Optional override — if provided, used instead of useQuestionBank().importQuestions */
  importFn?: (questions: CreateQuestionInput[]) => Promise<number>;
}

interface ParsedQuestion {
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer";
  options?: { id: string; text: string; isCorrect: boolean }[];
  correct_answer: unknown;
  explanation?: string;
  certification_level?: string;
  difficulty?: string;
  category_name?: string;
  tags?: string[];
  error?: string;
}

export function QuestionImporter({ categories, onImport, onCancel, importFn, defaultCertificationLevel }: QuestionImporterProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing">("upload");
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const { importQuestions } = useQuestionBank();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);

    try {
      const text = await file.text();
      let questions: ParsedQuestion[] = [];

      if (file.name.endsWith(".json")) {
        questions = parseJSON(text);
      } else if (file.name.endsWith(".csv")) {
        questions = parseCSV(text);
      } else {
        throw new Error("Unsupported file format. Please upload JSON or CSV.");
      }

      if (questions.length === 0) {
        throw new Error("No valid questions found in file.");
      }

      setParsedQuestions(questions);
      setStep("preview");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  const parseJSON = (text: string): ParsedQuestion[] => {
    const data = JSON.parse(text);
    const questions = Array.isArray(data) ? data : data.questions || [];

    return questions.map((q: Record<string, any>, i: number) => {
      try {
        // Validate required fields
        if (!q.question_text && !q.question && !q.text) {
          return { ...q, error: "Missing question text" } as ParsedQuestion;
        }

        const questionText = (q.question_text || q.question || q.text) as string;
        const questionType = ((q.question_type || q.type || "multiple_choice") as string).toLowerCase();

        // Parse options
        let options: { id: string; text: string; isCorrect: boolean }[] | undefined;
        let correctAnswer: unknown = q.correct_answer || q.answer;

        if (q.options && Array.isArray(q.options)) {
          options = (q.options as unknown[]).map((opt: unknown, idx: number) => {
            if (typeof opt === "string") {
              return {
                id: String.fromCharCode(97 + idx),
                text: opt,
                isCorrect: correctAnswer === opt || correctAnswer === idx || correctAnswer === String.fromCharCode(97 + idx),
              };
            }
            const optObj = opt as Record<string, any>;
            return {
              id: (optObj.id as string) || String.fromCharCode(97 + idx),
              text: (optObj.text as string) || String(opt),
              isCorrect: !!(optObj.isCorrect || optObj.correct),
            };
          });

          // If no option marked as correct, try to find it
          if (!options.some((o) => o.isCorrect) && correctAnswer !== undefined) {
            const correctIdx = typeof correctAnswer === "number" ? correctAnswer :
              typeof correctAnswer === "string" ? correctAnswer.charCodeAt(0) - 97 : -1;
            if (correctIdx >= 0 && correctIdx < options.length) {
              options[correctIdx].isCorrect = true;
            }
          }

          correctAnswer = { answerId: options.find((o) => o.isCorrect)?.id || "a" };
        }

        return {
          question_text: questionText,
          question_type: questionType as "multiple_choice" | "true_false" | "short_answer",
          options,
          correct_answer: correctAnswer,
          explanation: q.explanation as string | undefined,
          certification_level: q.certification_level as string | undefined,
          difficulty: q.difficulty as string | undefined,
          category_name: q.category as string | undefined,
          tags: q.tags as string[] | undefined,
        };
      } catch {
        return { question_text: `Question ${i + 1}`, error: "Failed to parse" } as ParsedQuestion;
      }
    });
  };

  const parseCSV = (text: string): ParsedQuestion[] => {
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const questions: ParsedQuestion[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx]?.replace(/^"|"$/g, "") || "";
      });

      const questionText = row.question || row.question_text || row.text;
      if (!questionText) continue;

      // Parse options from columns like option_a, option_b, etc.
      const options: { id: string; text: string; isCorrect: boolean }[] = [];
      ["a", "b", "c", "d", "e", "f"].forEach((letter) => {
        const optionText = row[`option_${letter}`] || row[`option${letter}`] || row[letter];
        if (optionText) {
          options.push({
            id: letter,
            text: optionText,
            isCorrect: (row.correct || row.answer || row.correct_answer || "").toLowerCase() === letter,
          });
        }
      });

      questions.push({
        question_text: questionText,
        question_type: options.length > 0 ? "multiple_choice" : "short_answer",
        options: options.length > 0 ? options : undefined,
        correct_answer: options.length > 0
          ? { answerId: row.correct || row.answer || "a" }
          : { text: row.correct || row.answer || "" },
        explanation: row.explanation || row.rationale,
        certification_level: row.certification || row.level || row.certification_level,
        difficulty: row.difficulty,
        category_name: row.category,
        tags: row.tags ? row.tags.split(";").map((t) => t.trim()) : undefined,
      });
    }

    return questions;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleImport = async () => {
    setStep("importing");

    const validQuestions = parsedQuestions.filter((q) => !q.error);

    const questionsToImport: CreateQuestionInput[] = validQuestions.map((q) => ({
      category_id: selectedCategoryId || undefined,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      certification_level: (q.certification_level as "EMR" | "EMT" | "AEMT" | "Paramedic" | "All") || (defaultCertificationLevel as "EMR" | "EMT" | "AEMT" | "Paramedic" | "All") || "EMT",
      difficulty: (q.difficulty as "easy" | "medium" | "hard" | "expert") || "medium",
      tags: q.tags,
    }));

    const count = await (importFn ? importFn(questionsToImport) : importQuestions(questionsToImport));

    if (count > 0) {
      await onImport();
    } else {
      setImportError("Failed to import questions");
      setStep("preview");
    }
  };

  const downloadTemplate = () => {
    const template = `question,option_a,option_b,option_c,option_d,correct,explanation,difficulty,certification,category,tags
"What is the normal respiratory rate for an adult?","12-20 breaths/min","8-12 breaths/min","20-30 breaths/min","30-40 breaths/min","a","Normal adult respiratory rate is 12-20 breaths per minute at rest.","easy","EMT","Vital Signs Assessment","vitals;assessment"
"A patient with a blood glucose of 45 mg/dL is experiencing:","Hypoglycemia","Hyperglycemia","Normal blood sugar","Diabetic ketoacidosis","a","Hypoglycemia is defined as blood glucose below 70 mg/dL.","medium","EMT","Diabetic Emergencies","diabetes;medical"`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question-bank-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === "upload") {
    return (
      <div className="space-y-6">
        {importError && (
          <Alert variant="error" title="Import Error">
            {importError}
          </Alert>
        )}

        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload Questions</h3>
          <p className="text-muted-foreground mb-4">
            Upload a CSV or JSON file containing your questions
          </p>
          <input
            type="file"
            accept=".csv,.json"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button asChild>
              <span>
                <FileText className="h-4 w-4 mr-2" />
                Select File
              </span>
            </Button>
          </label>
        </div>

        <div className="bg-muted rounded-lg p-4">
          <h4 className="font-medium mb-2">Supported Formats</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              <strong>CSV:</strong> Columns for question, options (option_a, option_b, etc.), correct answer, explanation
            </li>
            <li>
              <strong>JSON:</strong> Array of question objects with question_text, options, correct_answer fields
            </li>
          </ul>
          <Button variant="link" className="px-0 mt-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" />
            Download CSV Template
          </Button>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    const validCount = parsedQuestions.filter((q) => !q.error).length;
    const errorCount = parsedQuestions.filter((q) => q.error).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">{validCount} valid questions</span>
          </div>
          {errorCount > 0 && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">{errorCount} with errors</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Assign to Category (Optional)</label>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
          >
            <option value="">No Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-[300px] overflow-y-auto border rounded-lg divide-y">
          {parsedQuestions.map((q, i) => (
            <div
              key={i}
              className={`p-3 ${q.error ? "bg-red-50" : ""}`}
            >
              <div className="flex items-start gap-2">
                {q.error ? (
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium line-clamp-1">{q.question_text}</p>
                  {q.error ? (
                    <p className="text-sm text-red-600">{q.error}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {q.question_type} • {q.options?.length || 0} options
                      {q.difficulty && ` • ${q.difficulty}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setStep("upload")}>
            Back
          </Button>
          <Button onClick={handleImport} disabled={validCount === 0}>
            Import {validCount} Questions
          </Button>
        </div>
      </div>
    );
  }

  // Importing step
  return (
    <div className="py-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
      <p className="text-lg font-medium">Importing questions...</p>
      <p className="text-muted-foreground">This may take a moment</p>
    </div>
  );
}
