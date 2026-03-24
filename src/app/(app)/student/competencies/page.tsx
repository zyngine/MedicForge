"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Progress,
  Spinner,
  Select,
} from "@/components/ui";
import {
  CheckCircle,
  Circle,
  XCircle,
  Trophy,
  Target,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import { useMyEnrollments } from "@/lib/hooks/use-enrollments";
import { useMySkillProgress, type SkillProgress } from "@/lib/hooks/use-skills";
import { useStudentClinicalHours } from "@/lib/hooks/use-clinical-logs";
import { useUser } from "@/lib/hooks/use-user";
import { formatDate } from "@/lib/utils";

// TODO: These should come from course/program configuration
const REQUIRED_CLINICAL_HOURS = 48;
const REQUIRED_PATIENT_CONTACTS = 30;

export default function StudentCompetenciesPage() {
  const { user } = useUser();
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useMyEnrollments();
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>("");
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

  // Get course options from enrollments
  const courseOptions = React.useMemo(() => {
    return enrollments
      .filter((e) => e.status === "active" && e.course)
      .map((e) => ({
        value: e.course!.id,
        label: e.course!.title,
      }));
  }, [enrollments]);

  // Auto-select first course if none selected
  React.useEffect(() => {
    if (!selectedCourseId && courseOptions.length > 0) {
      setSelectedCourseId(courseOptions[0].value);
    }
  }, [courseOptions, selectedCourseId]);

  const { data: skillProgress, isLoading: skillsLoading } = useMySkillProgress(
    selectedCourseId || null
  );
  const { data: clinicalHours, isLoading: clinicalLoading } = useStudentClinicalHours(
    user?.id || null,
    selectedCourseId || null
  );

  const isLoading = enrollmentsLoading || skillsLoading || clinicalLoading;

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Courses Found</h3>
          <p className="text-muted-foreground">
            Enroll in a course to start tracking your competencies.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall NREMT readiness
  const skillsComplete = skillProgress
    ? skillProgress.categories.filter((c) => c.isComplete).length
    : 0;
  const totalCategories = skillProgress?.categories.length || 0;
  const hoursComplete = clinicalHours
    ? clinicalHours.verifiedHours >= REQUIRED_CLINICAL_HOURS
    : false;
  const contactsComplete = clinicalHours
    ? clinicalHours.verifiedContacts >= REQUIRED_PATIENT_CONTACTS
    : false;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Competency Tracker</h1>
          <p className="text-muted-foreground">
            Track your NREMT competency requirements and skill progression.
          </p>
        </div>
        {courseOptions.length > 1 && (
          <div className="w-full sm:w-64">
            <Select
              options={courseOptions}
              value={selectedCourseId}
              onChange={setSelectedCourseId}
              placeholder="Select course"
            />
          </div>
        )}
      </div>

      {/* Overall Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`p-3 rounded-lg ${
                  skillProgress && skillProgress.overallProgress >= 100
                    ? "bg-success/10 text-success"
                    : "bg-primary/10 text-primary"
                }`}
              >
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Skills Progress</p>
                <p className="text-2xl font-bold">
                  {skillProgress?.overallProgress || 0}%
                </p>
              </div>
            </div>
            <Progress
              value={skillProgress?.overallProgress || 0}
              size="md"
              variant={skillProgress && skillProgress.overallProgress >= 100 ? "success" : "default"}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {skillsComplete}/{totalCategories} categories complete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`p-3 rounded-lg ${
                  hoursComplete ? "bg-success/10 text-success" : "bg-info/10 text-info"
                }`}
              >
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clinical Hours</p>
                <p className="text-2xl font-bold">
                  {clinicalHours?.verifiedHours || 0}/{REQUIRED_CLINICAL_HOURS}
                </p>
              </div>
            </div>
            <Progress
              value={Math.min(((clinicalHours?.verifiedHours || 0) / REQUIRED_CLINICAL_HOURS) * 100, 100)}
              size="md"
              variant={hoursComplete ? "success" : "default"}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {clinicalHours?.pendingHours || 0} hours pending verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`p-3 rounded-lg ${
                  contactsComplete ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                }`}
              >
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Patient Contacts</p>
                <p className="text-2xl font-bold">
                  {clinicalHours?.verifiedContacts || 0}/{REQUIRED_PATIENT_CONTACTS}
                </p>
              </div>
            </div>
            <Progress
              value={Math.min(((clinicalHours?.verifiedContacts || 0) / REQUIRED_PATIENT_CONTACTS) * 100, 100)}
              size="md"
              variant={contactsComplete ? "success" : "warning"}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {clinicalHours?.teamLeadCount || 0} as team lead
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`p-3 rounded-lg ${
                  hoursComplete && contactsComplete && skillsComplete === totalCategories
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">NREMT Ready</p>
                <p className="text-2xl font-bold">
                  {hoursComplete && contactsComplete && skillsComplete === totalCategories
                    ? "Yes"
                    : "Not Yet"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {hoursComplete && contactsComplete && skillsComplete === totalCategories
                ? "All requirements met!"
                : "Complete all requirements to be NREMT ready"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Skills by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Competencies</CardTitle>
          <CardDescription>
            Track your progress on required NREMT skills by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!skillProgress || skillProgress.categories.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Skill Requirements</h3>
              <p className="text-muted-foreground">
                This course doesn't have skill competency requirements configured yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {skillProgress.categories.map((category) => (
                <div
                  key={category.categoryId}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.categoryId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg ${
                          category.isComplete
                            ? "bg-success/10 text-success"
                            : "bg-muted"
                        }`}
                      >
                        {category.isComplete ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{category.categoryName}</p>
                        <p className="text-sm text-muted-foreground">
                          {category.passedCount}/{category.requiredCount} skills passed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={category.isComplete ? "success" : "secondary"}
                      >
                        {category.isComplete ? "Complete" : "In Progress"}
                      </Badge>
                      {expandedCategories.has(category.categoryId) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Skills List */}
                  {expandedCategories.has(category.categoryId) && (
                    <div className="border-t bg-muted/30 p-4">
                      <div className="space-y-3">
                        {category.skills.map((skill) => (
                          <div
                            key={skill.skillId}
                            className="flex items-center justify-between p-3 bg-background rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {skill.passed ? (
                                <CheckCircle className="h-5 w-5 text-success" />
                              ) : skill.attempts > 0 ? (
                                <XCircle className="h-5 w-5 text-error" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <p className="font-medium text-sm">{skill.skillName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {skill.attempts} attempt{skill.attempts !== 1 ? "s" : ""}
                                  {skill.lastAttemptDate && (
                                    <> &middot; Last: {formatDate(skill.lastAttemptDate)}</>
                                  )}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={
                                skill.passed
                                  ? "success"
                                  : skill.attempts > 0
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {skill.passed
                                ? "Passed"
                                : skill.attempts > 0
                                ? "Not Passed"
                                : "Not Attempted"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
