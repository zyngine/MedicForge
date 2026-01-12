"use client";

import { format } from "date-fns";

// CSV Export utilities

type CSVValue = string | number | boolean | null | undefined | Date;

interface CSVOptions {
  headers?: string[];
  filename?: string;
  delimiter?: string;
  includeHeaders?: boolean;
}

function escapeCSVValue(value: CSVValue, delimiter = ","): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return format(value, "yyyy-MM-dd HH:mm:ss");
  }

  const stringValue = String(value);

  // If the value contains the delimiter, quotes, or newlines, wrap in quotes
  if (
    stringValue.includes(delimiter) ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function generateCSV<T extends Record<string, CSVValue>>(
  data: T[],
  options: CSVOptions = {}
): string {
  const {
    headers,
    delimiter = ",",
    includeHeaders = true,
  } = options;

  if (data.length === 0) {
    return headers?.join(delimiter) || "";
  }

  // Determine headers from data if not provided
  const columnHeaders = headers || Object.keys(data[0]);

  const rows: string[] = [];

  // Add header row
  if (includeHeaders) {
    rows.push(columnHeaders.map((h) => escapeCSVValue(h, delimiter)).join(delimiter));
  }

  // Add data rows
  data.forEach((row) => {
    const values = columnHeaders.map((header) => {
      const value = row[header];
      return escapeCSVValue(value, delimiter);
    });
    rows.push(values.join(delimiter));
  });

  return rows.join("\n");
}

export function downloadCSV<T extends Record<string, CSVValue>>(
  data: T[],
  options: CSVOptions = {}
): void {
  const { filename = "export.csv" } = options;
  const csvContent = generateCSV(data, options);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// JSON Export utilities

export function downloadJSON<T>(
  data: T,
  filename = "export.json",
  pretty = true
): void {
  const jsonContent = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Grade export helpers

export interface GradeExportData {
  studentName: string;
  studentEmail: string;
  studentId?: string;
  assignmentName: string;
  assignmentType: string;
  dueDate?: Date;
  submittedAt?: Date;
  rawScore: number;
  maxScore: number;
  percentage: number;
  curvedScore?: number;
  finalGrade?: string;
}

export function exportGradesToCSV(
  grades: GradeExportData[],
  filename = "grades-export"
): void {
  const data = grades.map((g) => ({
    "Student Name": g.studentName,
    "Student Email": g.studentEmail,
    "Student ID": g.studentId || "",
    Assignment: g.assignmentName,
    Type: g.assignmentType,
    "Due Date": g.dueDate || "",
    "Submitted At": g.submittedAt || "",
    "Raw Score": g.rawScore,
    "Max Score": g.maxScore,
    Percentage: `${g.percentage.toFixed(1)}%`,
    "Curved Score": g.curvedScore !== undefined ? g.curvedScore : "",
    "Final Grade": g.finalGrade || "",
  }));

  downloadCSV(data, {
    filename: `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`,
  });
}

// Attendance export helpers

export interface AttendanceExportData {
  studentName: string;
  studentEmail: string;
  date: Date;
  eventName: string;
  status: "present" | "absent" | "late" | "excused";
  checkInTime?: Date;
  notes?: string;
}

export function exportAttendanceToCSV(
  attendance: AttendanceExportData[],
  filename = "attendance-export"
): void {
  const data = attendance.map((a) => ({
    "Student Name": a.studentName,
    "Student Email": a.studentEmail,
    Date: a.date,
    Event: a.eventName,
    Status: a.status,
    "Check-in Time": a.checkInTime || "",
    Notes: a.notes || "",
  }));

  downloadCSV(data, {
    filename: `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`,
  });
}

// Clinical hours export helpers

export interface ClinicalHoursExportData {
  studentName: string;
  studentEmail: string;
  date: Date;
  siteName: string;
  siteType: string;
  hours: number;
  preceptor: string;
  patientContacts: number;
  verified: boolean;
  verifiedBy?: string;
}

export function exportClinicalHoursToCSV(
  hours: ClinicalHoursExportData[],
  filename = "clinical-hours-export"
): void {
  const data = hours.map((h) => ({
    "Student Name": h.studentName,
    "Student Email": h.studentEmail,
    Date: h.date,
    Site: h.siteName,
    "Site Type": h.siteType,
    Hours: h.hours,
    Preceptor: h.preceptor,
    "Patient Contacts": h.patientContacts,
    Verified: h.verified ? "Yes" : "No",
    "Verified By": h.verifiedBy || "",
  }));

  downloadCSV(data, {
    filename: `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`,
  });
}

// Competency report export

export interface CompetencyExportData {
  studentName: string;
  studentEmail: string;
  category: string;
  skillName: string;
  status: "completed" | "in_progress" | "not_started";
  attempts: number;
  lastAttemptDate?: Date;
  evaluator?: string;
}

export function exportCompetenciesToCSV(
  competencies: CompetencyExportData[],
  filename = "competencies-export"
): void {
  const data = competencies.map((c) => ({
    "Student Name": c.studentName,
    "Student Email": c.studentEmail,
    Category: c.category,
    Skill: c.skillName,
    Status: c.status,
    Attempts: c.attempts,
    "Last Attempt": c.lastAttemptDate || "",
    Evaluator: c.evaluator || "",
  }));

  downloadCSV(data, {
    filename: `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`,
  });
}

// Enrollment roster export

export interface EnrollmentExportData {
  studentName: string;
  studentEmail: string;
  studentId?: string;
  enrolledAt: Date;
  status: "active" | "completed" | "dropped";
  progress: number;
  lastActivity?: Date;
  currentGrade?: string;
}

export function exportEnrollmentRoster(
  enrollments: EnrollmentExportData[],
  courseName: string
): void {
  const data = enrollments.map((e) => ({
    "Student Name": e.studentName,
    "Student Email": e.studentEmail,
    "Student ID": e.studentId || "",
    "Enrolled At": e.enrolledAt,
    Status: e.status,
    "Progress %": e.progress,
    "Last Activity": e.lastActivity || "",
    "Current Grade": e.currentGrade || "",
  }));

  downloadCSV(data, {
    filename: `${courseName.replace(/[^a-z0-9]/gi, "-")}-roster-${format(new Date(), "yyyy-MM-dd")}.csv`,
  });
}
