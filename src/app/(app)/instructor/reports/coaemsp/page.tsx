"use client";

import { useState } from "react";
import { Button, Card, Badge } from "@/components/ui";
import {
  FileText,
  Download,
  Calendar,
  Users,
  Stethoscope,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Printer,
} from "lucide-react";
import {
  useCoAEMSPReports,
  type AnnualReport,
  type ClinicalSummary,
  type SkillsSummary,
} from "@/lib/hooks/use-coaemsp-reports";

export default function CoAEMSPReportsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState<AnnualReport | null>(null);
  const [clinicalSummary, setClinicalSummary] = useState<ClinicalSummary | null>(null);
  const [skillsSummary, setSkillsSummary] = useState<SkillsSummary | null>(null);

  const {
    isLoading,
    generateAnnualReport,
    generateClinicalSummary,
    generateSkillsSummary,
  } = useCoAEMSPReports();

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleGenerateReport = async () => {
    const data = await generateAnnualReport(selectedYear);
    setReport(data);
  };

  const handleGenerateClinical = async () => {
    const data = await generateClinicalSummary(
      `${selectedYear}-01-01`,
      `${selectedYear}-12-31`
    );
    setClinicalSummary(data);
  };

  const handleGenerateSkills = async () => {
    const data = await generateSkillsSummary(
      `${selectedYear}-01-01`,
      `${selectedYear}-12-31`
    );
    setSkillsSummary(data);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // In production, would use a PDF library like jspdf or server-side generation
    alert("PDF export would be implemented with a PDF generation library");
  };

  return (
    <div className="container mx-auto py-8 space-y-6 print:py-0">
      {/* Header - hidden on print */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            CoAEMSP Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate accreditation reports and program analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded-md border px-3 py-2"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Actions - hidden on print */}
      <div className="grid md:grid-cols-4 gap-4 print:hidden">
        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={handleGenerateReport}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Annual Report</p>
              <p className="text-sm text-muted-foreground">Full CoAEMSP report</p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={handleGenerateClinical}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Clinical Summary</p>
              <p className="text-sm text-muted-foreground">Hours & contacts</p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={handleGenerateSkills}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">Skills Summary</p>
              <p className="text-sm text-muted-foreground">Competency data</p>
            </div>
          </div>
        </Card>

        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => {}}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Cohort Analysis</p>
              <p className="text-sm text-muted-foreground">Outcomes by cohort</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Generating report...</p>
        </Card>
      )}

      {/* Annual Report Display */}
      {report && !isLoading && (
        <div className="space-y-6">
          {/* Print/Export Actions */}
          <div className="flex justify-end gap-3 print:hidden">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>

          {/* Report Header */}
          <Card className="p-6 print:shadow-none print:border-none">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">{report.programInfo.programName}</h2>
              <p className="text-lg text-muted-foreground">
                CoAEMSP Annual Report - {report.reportYear}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Program Level: {report.programInfo.programLevel}
                {report.programInfo.coaemspId && ` | CoAEMSP ID: ${report.programInfo.coaemspId}`}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Program Director:</span>{" "}
                {report.programInfo.programDirector || "Not specified"}
              </div>
              <div>
                <span className="text-muted-foreground">Medical Director:</span>{" "}
                {report.programInfo.medicalDirector || "Not specified"}
              </div>
            </div>
          </Card>

          {/* Outcomes Summary */}
          <Card className="p-6 print:shadow-none print:border-none">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Program Outcomes
            </h3>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{report.outcomes.aggregateMetrics.totalEnrolled}</p>
                <p className="text-sm text-muted-foreground">Total Enrolled</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{report.outcomes.aggregateMetrics.totalGraduated}</p>
                <p className="text-sm text-muted-foreground">Graduated</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {report.outcomes.aggregateMetrics.overallRetentionRate.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Retention Rate</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {report.outcomes.aggregateMetrics.overallCertificationRate.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Certification Rate</p>
              </div>
            </div>
          </Card>

          {/* Clinical Summary */}
          <Card className="p-6 print:shadow-none print:border-none">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Clinical Experience Summary
            </h3>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-2xl font-bold">{report.clinical.totalHours.toFixed(0)}</p>
                <p className="text-sm text-muted-foreground">
                  Total Hours (Required: {report.clinical.requiredHours})
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">{report.clinical.patientContactsTotal}</p>
                <p className="text-sm text-muted-foreground">Patient Contacts</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{report.clinical.teamLeadExperiences}</p>
                <p className="text-sm text-muted-foreground">Team Lead Experiences</p>
              </div>
            </div>

            {report.clinical.siteDistribution.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Site Type Distribution</h4>
                <div className="space-y-2">
                  {report.clinical.siteDistribution.map((site) => (
                    <div key={site.siteType} className="flex items-center gap-3">
                      <div className="w-24 text-sm">{site.siteType}</div>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${site.percentage}%` }}
                        />
                      </div>
                      <div className="w-20 text-sm text-right">
                        {site.hours.toFixed(0)}h ({site.percentage.toFixed(1)}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Skills Summary */}
          <Card className="p-6 print:shadow-none print:border-none">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Psychomotor Skills Summary
            </h3>
            <div className="grid md:grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-2xl font-bold">{report.skills.totalAttempts}</p>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{report.skills.passRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Overall Pass Rate</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{report.skills.firstAttemptPassRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">First Attempt Pass</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{report.skills.criticalFailureRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Critical Failure Rate</p>
              </div>
            </div>

            {report.skills.mostChallenging.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Skills Requiring Additional Focus</h4>
                <div className="space-y-2">
                  {report.skills.mostChallenging.map((skill) => (
                    <div
                      key={skill.skill}
                      className="flex items-center justify-between p-2 bg-red-50 rounded"
                    >
                      <span>{skill.skill}</span>
                      <Badge variant="destructive">{skill.passRate.toFixed(1)}% pass rate</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Program Goals */}
          <Card className="p-6 print:shadow-none print:border-none">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Program Goals & Thresholds
            </h3>
            <div className="space-y-3">
              {report.goals.map((goal, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    goal.met ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {goal.met ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">{goal.metric}</span>
                  </div>
                  <div className="text-right">
                    <span className={goal.met ? "text-green-700" : "text-red-700"}>
                      {goal.actual.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground ml-2">
                      (threshold: {goal.threshold}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground print:mt-8">
            <p>Report generated on {new Date(report.generatedAt).toLocaleString()}</p>
            <p>MedicForge - EMS Learning Management System</p>
          </div>
        </div>
      )}

      {/* Clinical Summary (standalone) */}
      {clinicalSummary && !report && !isLoading && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Clinical Summary - {selectedYear}</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-3xl font-bold">{clinicalSummary.totalHours.toFixed(0)}</p>
              <p className="text-muted-foreground">Total Hours</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{clinicalSummary.patientContactsTotal}</p>
              <p className="text-muted-foreground">Patient Contacts</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{clinicalSummary.teamLeadExperiences}</p>
              <p className="text-muted-foreground">Team Lead Experiences</p>
            </div>
          </div>
        </Card>
      )}

      {/* Skills Summary (standalone) */}
      {skillsSummary && !report && !isLoading && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Skills Summary - {selectedYear}</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <p className="text-3xl font-bold">{skillsSummary.totalAttempts}</p>
              <p className="text-muted-foreground">Total Attempts</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{skillsSummary.passRate.toFixed(1)}%</p>
              <p className="text-muted-foreground">Pass Rate</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{skillsSummary.firstAttemptPassRate.toFixed(1)}%</p>
              <p className="text-muted-foreground">First Attempt Pass</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{skillsSummary.criticalFailureRate.toFixed(1)}%</p>
              <p className="text-muted-foreground">Critical Failures</p>
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!report && !clinicalSummary && !skillsSummary && !isLoading && (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Generate a Report</h3>
          <p className="text-muted-foreground mb-4">
            Select a report type above to generate CoAEMSP-compliant documentation
          </p>
          <Button onClick={handleGenerateReport}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Annual Report
          </Button>
        </Card>
      )}
    </div>
  );
}
