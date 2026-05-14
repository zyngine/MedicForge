"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui";
import { Download, Upload, X, CheckCircle2, AlertTriangle } from "lucide-react";

export interface ParsedQuestion {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  difficulty: "easy" | "medium" | "hard";
}

interface ParseRow {
  raw: Record<string, string>;
  parsed: ParsedQuestion | null;
  error: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (questions: ParsedQuestion[]) => Promise<void>;
}

const TEMPLATE_HEADERS = [
  "question",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct",
  "explanation",
  "difficulty",
];

const TEMPLATE_EXAMPLES: string[][] = [
  [
    "What does CPR stand for?",
    "Cardiopulmonary Resuscitation",
    "Cardiac Pulse Recovery",
    "Coronary Pulmonary Repair",
    "Common Patient Rescue",
    "A",
    "CPR is the standard term for cardiopulmonary resuscitation.",
    "easy",
  ],
  [
    "Adult compression rate per minute?",
    "60-80",
    "100-120",
    "120-160",
    "80-100",
    "B",
    "AHA guidelines: 100-120 compressions per minute.",
    "medium",
  ],
];

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES];
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quiz-questions-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const LETTER_TO_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };

function validateRow(raw: Record<string, string>): { parsed: ParsedQuestion | null; error: string | null } {
  const question_text = (raw.question || "").trim();
  if (!question_text) return { parsed: null, error: "Missing question" };

  const optionFields = ["option_a", "option_b", "option_c", "option_d", "option_e", "option_f"];
  const options = optionFields
    .map((f) => (raw[f] || "").trim())
    .filter((o) => o.length > 0);
  if (options.length < 2) return { parsed: null, error: "Need at least 2 options" };

  const correctRaw = (raw.correct || "").trim().toUpperCase();
  if (!correctRaw) return { parsed: null, error: "Missing correct answer" };

  let correctIndex = -1;
  if (correctRaw in LETTER_TO_INDEX) {
    correctIndex = LETTER_TO_INDEX[correctRaw];
  } else if (/^\d+$/.test(correctRaw)) {
    correctIndex = parseInt(correctRaw, 10) - 1;
  } else {
    const matchByText = options.findIndex((o) => o.toLowerCase() === correctRaw.toLowerCase());
    correctIndex = matchByText;
  }

  if (correctIndex < 0 || correctIndex >= options.length) {
    return { parsed: null, error: `Correct answer "${raw.correct}" does not match a filled option` };
  }

  const diff = (raw.difficulty || "medium").trim().toLowerCase();
  const difficulty: "easy" | "medium" | "hard" =
    diff === "easy" || diff === "hard" ? diff : "medium";

  return {
    parsed: {
      question_text,
      options,
      correct_answer: options[correctIndex],
      explanation: (raw.explanation || "").trim() || null,
      difficulty,
    },
    error: null,
  };
}

export function QuizCsvImport({ open, onClose, onImport }: Props) {
  const [rows, setRows] = useState<ParseRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setFileName(null);
    setParseError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (file: File) => {
    setParseError(null);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (result) => {
        if (!result.data.length) {
          setParseError("CSV is empty or has no data rows.");
          setRows([]);
          return;
        }
        const parsed: ParseRow[] = result.data.map((raw) => {
          const v = validateRow(raw);
          return { raw, parsed: v.parsed, error: v.error };
        });
        setRows(parsed);
      },
      error: (err) => {
        setParseError(`Parse error: ${err.message}`);
        setRows([]);
      },
    });
  };

  const validRows = rows.filter((r) => r.parsed);
  const invalidRows = rows.filter((r) => !r.parsed);

  const doImport = async () => {
    setImporting(true);
    try {
      await onImport(validRows.map((r) => r.parsed!));
      handleClose();
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-lg">Import Questions from CSV</h3>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {rows.length === 0 ? (
            <>
              <div className="bg-muted/30 border rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">CSV format</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Required headers: <code className="text-foreground">question</code>, <code className="text-foreground">option_a</code>, <code className="text-foreground">option_b</code>, <code className="text-foreground">correct</code></li>
                  <li>Optional: <code className="text-foreground">option_c</code>, <code className="text-foreground">option_d</code>, <code className="text-foreground">option_e</code>, <code className="text-foreground">option_f</code>, <code className="text-foreground">explanation</code>, <code className="text-foreground">difficulty</code></li>
                  <li><code className="text-foreground">correct</code> accepts a letter (A/B/C/D), a 1-based index (1/2/3/4), or the exact option text</li>
                  <li><code className="text-foreground">difficulty</code> accepts <code className="text-foreground">easy</code>, <code className="text-foreground">medium</code>, or <code className="text-foreground">hard</code> (default: medium)</li>
                </ul>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1 text-xs text-red-700 hover:underline mt-1"
                >
                  <Download className="h-3 w-3" />
                  Download template
                </button>
              </div>

              <label className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to select a .csv file</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>

              {parseError && (
                <p className="text-sm text-red-600">{parseError}</p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {validRows.length} valid · {invalidRows.length > 0 && <span className="text-red-700">{invalidRows.length} with errors · </span>}
                    {rows.length} total
                  </p>
                </div>
                <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground underline">
                  Choose a different file
                </button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2 w-8"></th>
                      <th className="text-left p-2">Question</th>
                      <th className="text-left p-2 w-32">Correct</th>
                      <th className="text-left p-2 w-24">Difficulty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className={`border-t ${r.error ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                        <td className="p-2 text-center">
                          {r.parsed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600 mx-auto" />
                          )}
                        </td>
                        <td className="p-2">
                          <p className="line-clamp-2 text-xs">{r.raw.question || <em className="text-muted-foreground">(blank)</em>}</p>
                          {r.error && <p className="text-xs text-red-700 mt-0.5">{r.error}</p>}
                        </td>
                        <td className="p-2 text-xs">
                          {r.parsed?.correct_answer ? (
                            <span className="line-clamp-1">{r.parsed.correct_answer}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-2 text-xs">{r.parsed?.difficulty || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t bg-muted/30">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={doImport}
            disabled={importing || validRows.length === 0}
          >
            {importing ? "Importing…" : `Import ${validRows.length} Question${validRows.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
