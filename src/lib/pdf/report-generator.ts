"use client";

import { jsPDF } from "jspdf";
import { format } from "date-fns";

// Common report types
export interface ReportHeader {
  title: string;
  subtitle?: string;
  tenantName: string;
  tenantLogo?: string;
  generatedBy?: string;
  generatedAt?: Date;
}

export interface StudentInfo {
  name: string;
  email: string;
  studentId?: string;
  courseName?: string;
  courseType?: string;
}

// Competency Report Types
export interface CompetencyReportData {
  header: ReportHeader;
  student: StudentInfo;
  summary: {
    totalSkills: number;
    completedSkills: number;
    inProgressSkills: number;
    totalHours: number;
    requiredHours: number;
    totalPatients: number;
    requiredPatients: number;
  };
  categories: Array<{
    name: string;
    skills: Array<{
      name: string;
      status: "completed" | "in_progress" | "not_started";
      attempts: number;
      lastAttempt?: Date;
      evaluator?: string;
    }>;
  }>;
  clinicalHours: Array<{
    date: Date;
    site: string;
    hours: number;
    verified: boolean;
  }>;
}

// Grade Report Types
export interface GradeReportData {
  header: ReportHeader;
  student: StudentInfo;
  summary: {
    currentGrade: string;
    gradePercentage: number;
    totalPoints: number;
    earnedPoints: number;
    rank?: number;
    totalStudents?: number;
  };
  assignments: Array<{
    name: string;
    type: string;
    dueDate?: Date;
    submittedAt?: Date;
    score: number;
    maxScore: number;
    percentage: number;
    weight?: number;
  }>;
}

// Clinical Log Report Types
export interface ClinicalLogReportData {
  header: ReportHeader;
  student: StudentInfo;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalShifts: number;
    totalHours: number;
    totalPatients: number;
    siteCount: number;
  };
  logs: Array<{
    date: Date;
    site: string;
    startTime: string;
    endTime: string;
    hours: number;
    preceptor: string;
    patients: number;
    verified: boolean;
  }>;
}

// Base PDF generator class
class ReportGenerator {
  protected doc: jsPDF;
  protected pageWidth: number;
  protected pageHeight: number;
  protected margin: number;
  protected currentY: number;
  protected primaryColor: string;

  constructor(options?: { orientation?: "portrait" | "landscape"; primaryColor?: string }) {
    this.doc = new jsPDF({
      orientation: options?.orientation || "portrait",
      unit: "mm",
      format: "letter",
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 15;
    this.currentY = this.margin;
    this.primaryColor = options?.primaryColor || "#2563eb";
  }

  protected hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  }

  protected addHeader(header: ReportHeader): void {
    const rgb = this.hexToRgb(this.primaryColor);

    // Title bar
    this.doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    this.doc.rect(0, 0, this.pageWidth, 25, "F");

    // Title
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(18);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(header.title, this.margin, 15);

    // Tenant name
    this.doc.setFontSize(10);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(header.tenantName, this.pageWidth - this.margin, 10, { align: "right" });

    // Generated date
    const generatedAt = header.generatedAt || new Date();
    this.doc.text(
      `Generated: ${format(generatedAt, "MMM d, yyyy h:mm a")}`,
      this.pageWidth - this.margin,
      16,
      { align: "right" }
    );

    this.currentY = 35;

    // Subtitle
    if (header.subtitle) {
      this.doc.setTextColor(100, 100, 100);
      this.doc.setFontSize(12);
      this.doc.text(header.subtitle, this.margin, this.currentY);
      this.currentY += 10;
    }
  }

  protected addStudentInfo(student: StudentInfo): void {
    this.doc.setFillColor(245, 245, 245);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 20, "F");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(12);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(student.name, this.margin + 5, this.currentY + 8);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(10);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text(student.email, this.margin + 5, this.currentY + 15);

    if (student.courseName) {
      this.doc.text(
        `${student.courseName}${student.courseType ? ` (${student.courseType})` : ""}`,
        this.pageWidth - this.margin - 5,
        this.currentY + 12,
        { align: "right" }
      );
    }

    this.currentY += 28;
  }

  protected addSectionTitle(title: string): void {
    if (this.currentY > this.pageHeight - 40) {
      this.doc.addPage();
      this.currentY = this.margin;
    }

    const rgb = this.hexToRgb(this.primaryColor);
    this.doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.margin + 40, this.currentY);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(14);
    this.doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    this.doc.text(title, this.margin, this.currentY + 8);

    this.currentY += 15;
  }

  protected addTableHeader(columns: Array<{ title: string; width: number }>): number {
    const startX = this.margin;
    const headerHeight = 8;

    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(
      startX,
      this.currentY,
      this.pageWidth - 2 * this.margin,
      headerHeight,
      "F"
    );

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(9);
    this.doc.setTextColor(60, 60, 60);

    let x = startX + 2;
    columns.forEach((col) => {
      this.doc.text(col.title, x, this.currentY + 5.5);
      x += col.width;
    });

    this.currentY += headerHeight + 2;
    return startX;
  }

  protected addTableRow(
    columns: Array<{ value: string; width: number }>,
    startX: number,
    isAlternate = false
  ): void {
    const rowHeight = 7;

    if (this.currentY > this.pageHeight - 20) {
      this.doc.addPage();
      this.currentY = this.margin;
    }

    if (isAlternate) {
      this.doc.setFillColor(250, 250, 250);
      this.doc.rect(
        startX,
        this.currentY - 1,
        this.pageWidth - 2 * this.margin,
        rowHeight,
        "F"
      );
    }

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.setTextColor(0, 0, 0);

    let x = startX + 2;
    columns.forEach((col) => {
      this.doc.text(col.value, x, this.currentY + 4);
      x += col.width;
    });

    this.currentY += rowHeight;
  }

  protected addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(150, 150, 150);
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: "center" }
      );
      this.doc.text("MedicForge", this.margin, this.pageHeight - 10);
    }
  }

  public getBlob(): Blob {
    return this.doc.output("blob");
  }

  public download(filename: string): void {
    this.doc.save(filename);
  }
}

// Competency Report Generator
export function generateCompetencyReport(data: CompetencyReportData): Blob {
  const gen = new (class extends ReportGenerator {
    generate(): void {
      this.addHeader(data.header);
      this.addStudentInfo(data.student);

      // Summary
      this.addSectionTitle("Progress Summary");
      const summaryText = [
        `Skills: ${data.summary.completedSkills}/${data.summary.totalSkills} completed`,
        `Clinical Hours: ${data.summary.totalHours}/${data.summary.requiredHours}`,
        `Patient Contacts: ${data.summary.totalPatients}/${data.summary.requiredPatients}`,
      ];

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(11);
      this.doc.setTextColor(0, 0, 0);
      summaryText.forEach((line) => {
        this.doc.text(line, this.margin, this.currentY);
        this.currentY += 6;
      });
      this.currentY += 5;

      // Skills by category
      data.categories.forEach((category) => {
        this.addSectionTitle(category.name);

        const columns = [
          { title: "Skill", width: 80 },
          { title: "Status", width: 30 },
          { title: "Attempts", width: 25 },
          { title: "Last Attempt", width: 35 },
        ];

        const startX = this.addTableHeader(columns);

        category.skills.forEach((skill, idx) => {
          this.addTableRow(
            [
              { value: skill.name, width: 80 },
              {
                value: skill.status === "completed" ? "✓ Complete" : skill.status === "in_progress" ? "In Progress" : "Not Started",
                width: 30,
              },
              { value: skill.attempts.toString(), width: 25 },
              {
                value: skill.lastAttempt ? format(skill.lastAttempt, "MM/dd/yy") : "-",
                width: 35,
              },
            ],
            startX,
            idx % 2 === 1
          );
        });

        this.currentY += 8;
      });

      // Clinical Hours Log
      if (data.clinicalHours.length > 0) {
        this.addSectionTitle("Clinical Hours Log");

        const columns = [
          { title: "Date", width: 30 },
          { title: "Site", width: 80 },
          { title: "Hours", width: 25 },
          { title: "Status", width: 30 },
        ];

        const startX = this.addTableHeader(columns);

        data.clinicalHours.forEach((log, idx) => {
          this.addTableRow(
            [
              { value: format(log.date, "MM/dd/yy"), width: 30 },
              { value: log.site, width: 80 },
              { value: log.hours.toString(), width: 25 },
              { value: log.verified ? "Verified" : "Pending", width: 30 },
            ],
            startX,
            idx % 2 === 1
          );
        });
      }

      this.addFooter();
    }
  })();

  gen.generate();
  return gen.getBlob();
}

// Grade Report Generator
export function generateGradeReport(data: GradeReportData): Blob {
  const gen = new (class extends ReportGenerator {
    generate(): void {
      this.addHeader(data.header);
      this.addStudentInfo(data.student);

      // Summary
      this.addSectionTitle("Grade Summary");

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(24);
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(
        `${data.summary.gradePercentage.toFixed(1)}%`,
        this.margin,
        this.currentY + 5
      );

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(14);
      this.doc.text(`Grade: ${data.summary.currentGrade}`, this.margin + 35, this.currentY + 5);

      this.doc.setFontSize(10);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(
        `${data.summary.earnedPoints} / ${data.summary.totalPoints} points`,
        this.margin,
        this.currentY + 12
      );

      if (data.summary.rank && data.summary.totalStudents) {
        this.doc.text(
          `Class Rank: ${data.summary.rank} of ${data.summary.totalStudents}`,
          this.margin + 50,
          this.currentY + 12
        );
      }

      this.currentY += 20;

      // Assignments
      this.addSectionTitle("Assignments");

      const columns = [
        { title: "Assignment", width: 60 },
        { title: "Type", width: 25 },
        { title: "Due Date", width: 25 },
        { title: "Score", width: 30 },
        { title: "%", width: 20 },
      ];

      const startX = this.addTableHeader(columns);

      data.assignments.forEach((assignment, idx) => {
        this.addTableRow(
          [
            { value: assignment.name.substring(0, 30), width: 60 },
            { value: assignment.type, width: 25 },
            {
              value: assignment.dueDate ? format(assignment.dueDate, "MM/dd/yy") : "-",
              width: 25,
            },
            { value: `${assignment.score}/${assignment.maxScore}`, width: 30 },
            { value: `${assignment.percentage.toFixed(1)}%`, width: 20 },
          ],
          startX,
          idx % 2 === 1
        );
      });

      this.addFooter();
    }
  })();

  gen.generate();
  return gen.getBlob();
}

// Clinical Log Report Generator
export function generateClinicalLogReport(data: ClinicalLogReportData): Blob {
  const gen = new (class extends ReportGenerator {
    generate(): void {
      this.addHeader(data.header);
      this.addStudentInfo(data.student);

      // Date range
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(10);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(
        `Period: ${format(data.dateRange.start, "MMM d, yyyy")} - ${format(data.dateRange.end, "MMM d, yyyy")}`,
        this.margin,
        this.currentY
      );
      this.currentY += 10;

      // Summary
      this.addSectionTitle("Summary");

      const summaryItems = [
        { label: "Total Shifts", value: data.summary.totalShifts.toString() },
        { label: "Total Hours", value: data.summary.totalHours.toString() },
        { label: "Patient Contacts", value: data.summary.totalPatients.toString() },
        { label: "Sites Visited", value: data.summary.siteCount.toString() },
      ];

      const boxWidth = (this.pageWidth - 2 * this.margin - 15) / 4;
      summaryItems.forEach((item, idx) => {
        const x = this.margin + idx * (boxWidth + 5);
        this.doc.setFillColor(245, 245, 245);
        this.doc.rect(x, this.currentY, boxWidth, 20, "F");

        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(16);
        this.doc.setTextColor(0, 0, 0);
        this.doc.text(item.value, x + boxWidth / 2, this.currentY + 10, { align: "center" });

        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(8);
        this.doc.setTextColor(100, 100, 100);
        this.doc.text(item.label, x + boxWidth / 2, this.currentY + 16, { align: "center" });
      });

      this.currentY += 30;

      // Clinical Logs
      this.addSectionTitle("Clinical Shifts");

      const columns = [
        { title: "Date", width: 22 },
        { title: "Site", width: 50 },
        { title: "Time", width: 30 },
        { title: "Hours", width: 18 },
        { title: "Preceptor", width: 35 },
        { title: "Status", width: 20 },
      ];

      const startX = this.addTableHeader(columns);

      data.logs.forEach((log, idx) => {
        this.addTableRow(
          [
            { value: format(log.date, "MM/dd/yy"), width: 22 },
            { value: log.site.substring(0, 25), width: 50 },
            { value: `${log.startTime}-${log.endTime}`, width: 30 },
            { value: log.hours.toString(), width: 18 },
            { value: log.preceptor.substring(0, 20), width: 35 },
            { value: log.verified ? "✓" : "Pending", width: 20 },
          ],
          startX,
          idx % 2 === 1
        );
      });

      this.addFooter();
    }
  })();

  gen.generate();
  return gen.getBlob();
}

// Download helper
export function downloadReport(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
