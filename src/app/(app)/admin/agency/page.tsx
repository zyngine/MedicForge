"use client";

import { Card, CardContent, CardHeader, CardTitle, Spinner, Badge, Button } from "@/components/ui";
import { useEmployeeStats, useExpiringCertifications } from "@/lib/hooks/use-agency-employees";
import { useSkillLibraryStats } from "@/lib/hooks/use-skill-library";
import { useAgencyCompetencyStats } from "@/lib/hooks/use-employee-competencies";
import { useActiveCycles, useEndingCycles } from "@/lib/hooks/use-verification-cycles";
import { useMedicalDirectors } from "@/lib/hooks/use-medical-directors";
import {
  Users,
  BookOpen,
  CalendarClock,
  UserCog,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function AgencyDashboardPage() {
  const { data: employeeStats, isLoading: loadingEmployees } = useEmployeeStats();
  const { data: skillStats, isLoading: loadingSkills } = useSkillLibraryStats();
  const { data: competencyStats, isLoading: loadingCompetencies } = useAgencyCompetencyStats();
  const { data: activeCycles, isLoading: loadingCycles } = useActiveCycles();
  const { data: endingCycles } = useEndingCycles(30);
  const { data: expiringCerts } = useExpiringCertifications(30);
  const { data: medicalDirectors, isLoading: loadingMDs } = useMedicalDirectors({ isActive: true });

  const isLoading = loadingEmployees || loadingSkills || loadingCompetencies || loadingCycles || loadingMDs;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Agency Portal</h1>
        <p className="text-muted-foreground">
          Manage employee competency verification and medical director oversight
        </p>
      </div>

      {/* Alert Banner - if there are issues */}
      {((expiringCerts?.length || 0) > 0 || (endingCycles?.length || 0) > 0) && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">Action Required</p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  {(expiringCerts?.length || 0) > 0 && (
                    <li>{expiringCerts?.length} employee certification(s) expiring within 30 days</li>
                  )}
                  {(endingCycles?.length || 0) > 0 && (
                    <li>{endingCycles?.length} verification cycle(s) ending within 30 days</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeStats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {employeeStats?.inactive || 0} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skills in Library</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skillStats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {skillStats?.categoryCount || 0} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cycles</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCycles?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              verification cycles in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medical Directors</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicalDirectors?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              assigned to agency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Competency Progress */}
      {competencyStats && competencyStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Overall Competency Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <span className="text-2xl font-bold">{competencyStats.completionRate}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${competencyStats.completionRate}%` }}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-lg font-semibold text-amber-600">
                    {competencyStats.byStatus.pending || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {competencyStats.byStatus.completed || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {competencyStats.byStatus.verified || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Verified</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-red-600">
                    {competencyStats.byStatus.expired || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Expired</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/agency/employees/new">
              <Button variant="outline" className="w-full justify-between">
                Add New Employee
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/agency/cycles/new">
              <Button variant="outline" className="w-full justify-between">
                Create Verification Cycle
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/agency/skills">
              <Button variant="outline" className="w-full justify-between">
                Manage Skills Library
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/agency/medical-directors">
              <Button variant="outline" className="w-full justify-between">
                Assign Medical Director
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Certification Levels Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Employees by Certification</CardTitle>
          </CardHeader>
          <CardContent>
            {employeeStats?.byCertificationLevel && Object.keys(employeeStats.byCertificationLevel).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(employeeStats.byCertificationLevel).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{level}</Badge>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No employees added yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Verification Cycles */}
      {activeCycles && activeCycles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Verification Cycles</CardTitle>
            <Link href="/admin/agency/cycles">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeCycles.slice(0, 3).map((cycle) => (
                <div
                  key={cycle.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{cycle.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={cycle.is_active ? "default" : "secondary"}>
                      {cycle.cycle_type}
                    </Badge>
                    <Link href={`/admin/agency/cycles/${cycle.id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiring Certifications */}
      {expiringCerts && expiringCerts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Clock className="h-5 w-5" />
              Expiring Certifications (30 days)
            </CardTitle>
            <Link href="/admin/agency/employees?filter=expiring">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringCerts.slice(0, 5).map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                >
                  <div>
                    <p className="font-medium">{employee.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {employee.certification_level} - Expires: {new Date(employee.certification_expiration!).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-500 text-amber-700">
                    {Math.ceil((new Date(employee.certification_expiration!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!employeeStats?.total && !activeCycles?.length && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Get Started with Agency Portal</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Start by adding your employees and creating a verification cycle to track their competencies.
            </p>
            <div className="flex gap-3">
              <Link href="/admin/agency/employees/new">
                <Button>Add First Employee</Button>
              </Link>
              <Link href="/admin/agency/cycles/new">
                <Button variant="outline">Create Verification Cycle</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
