/**
 * Import Parser Utilities
 * Handles CSV and Excel file parsing for bulk imports
 */

import Papa from "papaparse";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ExcelJS = require("exceljs");

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationResult {
  row: number;
  field: string;
  severity: ValidationSeverity;
  message: string;
}

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  validations: ValidationResult[];
  isValid: boolean;
  hasWarnings: boolean;
}

export interface ParseResult<_T = Record<string, string>> {
  success: boolean;
  data: ParsedRow[];
  headers: string[];
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  parseError?: string;
}

/**
 * Parse a file (CSV or Excel) and return raw data
 */
export async function parseFile(file: File): Promise<{
  data: Record<string, string>[];
  headers: string[];
  error?: string;
}> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".csv")) {
    return parseCSV(file);
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    return parseExcel(file);
  } else {
    return {
      data: [],
      headers: [],
      error: "Unsupported file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
    };
  }
}

/**
 * Parse CSV file using PapaParse
 */
async function parseCSV(file: File): Promise<{
  data: Record<string, string>[];
  headers: string[];
  error?: string;
}> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (results) => {
        if (results.errors.length > 0) {
          resolve({
            data: [],
            headers: [],
            error: `CSV parsing error: ${results.errors[0].message}`,
          });
          return;
        }

        const headers = results.meta.fields || [];
        const data = results.data as Record<string, string>[];

        resolve({ data, headers });
      },
      error: (error) => {
        resolve({
          data: [],
          headers: [],
          error: `Failed to parse CSV: ${error.message}`,
        });
      },
    });
  });
}

/**
 * Parse Excel file using ExcelJS
 */
async function parseExcel(file: File): Promise<{
  data: Record<string, string>[];
  headers: string[];
  error?: string;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // Get the first sheet
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet || worksheet.rowCount === 0) {
      return { data: [], headers: [], error: "Excel file has no sheets" };
    }

    // Get headers from the first row
    const headerRow = worksheet.getRow(1);
    const colToHeader: Record<number, string> = {};
    const normalizedHeaders: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headerRow.eachCell({ includeEmpty: false }, (cell: any, colNumber: any) => {
      const value = cell.value;
      const header = value !== null && value !== undefined ? String(value).trim().toLowerCase().replace(/\s+/g, "_") : "";
      if (header) {
        colToHeader[colNumber] = header;
        normalizedHeaders.push(header);
      }
    });

    if (normalizedHeaders.length === 0) {
      return { data: [], headers: [], error: "Excel file is empty or has no data rows" };
    }

    // Parse data rows (skip header row)
    const data: Record<string, string>[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worksheet.eachRow({ includeEmpty: false }, (row: any, rowNumber: any) => {
      if (rowNumber === 1) return;
      const rowData: Record<string, string> = {};
      for (const header of normalizedHeaders) {
        rowData[header] = "";
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      row.eachCell({ includeEmpty: true }, (cell: any, colNumber: any) => {
        const header = colToHeader[colNumber];
        if (header) {
          const value = cell.value;
          rowData[header] = value !== null && value !== undefined ? String(value) : "";
        }
      });
      data.push(rowData);
    });

    if (data.length === 0) {
      return { data: [], headers: [], error: "Excel file is empty or has no data rows" };
    }

    return { data, headers: normalizedHeaders };
  } catch (error) {
    return {
      data: [],
      headers: [],
      error: `Failed to parse Excel file: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Parse date in various formats
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;

  const trimmed = dateStr.trim();

  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed + "T00:00:00");
    if (!isNaN(date.getTime())) return date;
  }

  // Try MM/DD/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split("/");
    const date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    if (!isNaN(date.getTime())) return date;
  }

  // Try MM-DD-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    const parts = trimmed.split("-");
    const date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    if (!isNaN(date.getTime())) return date;
  }

  // Try JavaScript Date parsing as fallback
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) return date;

  return null;
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Check for duplicate values in a specific field or using a key function across all rows
 */
export function findDuplicates(
  data: Record<string, string>[],
  fieldOrKeyFn: string | ((row: Record<string, string>) => string)
): Map<string, number[]> {
  const valueToRows = new Map<string, number[]>();

  const getKey = typeof fieldOrKeyFn === "string"
    ? (row: Record<string, string>) => row[fieldOrKeyFn]?.toLowerCase().trim()
    : fieldOrKeyFn;

  data.forEach((row, index) => {
    const value = getKey(row);
    if (value) {
      const rows = valueToRows.get(value) || [];
      rows.push(index + 1); // 1-indexed row numbers
      valueToRows.set(value, rows);
    }
  });

  // Filter to only keep duplicates
  const duplicates = new Map<string, number[]>();
  valueToRows.forEach((rows, value) => {
    if (rows.length > 1) {
      duplicates.set(value, rows);
    }
  });

  return duplicates;
}

/**
 * Generate a CSV template string from field definitions
 */
export function generateCSVTemplate(
  fields: Array<{ name: string; example?: string }>
): string {
  const headers = fields.map((f) => f.name).join(",");
  const example = fields.map((f) => f.example || "").join(",");
  return `${headers}\n${example}`;
}

/**
 * Download a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = "text/csv") {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Sanitize text input to prevent XSS
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
}

/**
 * Validate file before parsing
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedExtensions = [".csv", ".xlsx", ".xls"];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "File size exceeds 5MB limit",
    };
  }

  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedExtensions.join(", ")}`,
    };
  }

  return { valid: true };
}
