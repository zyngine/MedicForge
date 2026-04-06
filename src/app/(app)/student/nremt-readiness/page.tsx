"use client";

import { Card, Badge, Button } from "@/components/ui";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  ClipboardCheck,
  Stethoscope,
  Brain,
  RefreshCw,
  ChevronRight,
  Info,
} from "lucide-react";
import { useNREMTPrediction } from "@/lib/hooks/use-nremt-prediction";
import { useUser } from "@/lib/hooks/use-user";
import Link from "next/link";

export default function NREMTReadinessPage() {
  const { profile } = useUser();
  // Use the student's certification level from their profile, fall back to "EMT" if not set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const certificationLevel = (profile as any)?.certification_level || "EMT";
  const { prediction, isLoading, refresh } = useNREMTPrediction(undefined, certificationLevel);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "text-green-600 bg-green-100";
      case "moderate": return "text-yellow-600 bg-yellow-100";
      case "high": return "text-orange-600 bg-orange-100";
      case "critical": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return <TrendingUp className="h-5 w-5 text-green-600" />;
      case "declining": return <TrendingDown className="h-5 w-5 text-red-600" />;
      default: return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Analyzing your performance...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="container mx-auto py-8">
        <Card className="p-8 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Not Enough Data</h2>
          <p className="text-muted-foreground mb-4">
            Complete more coursework to generate your NREMT pass prediction.
          </p>
          <Link href="/student/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            NREMT Readiness
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered analysis of your exam readiness
          </p>
        </div>
        <Button variant="outline" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      {/* Main Score Card */}
      <Card className="p-8">
        <div className="flex items-center gap-8">
          {/* Score Circle */}
          <div className="relative">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                className="stroke-muted fill-none"
                strokeWidth="12"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                className={`fill-none ${
                  prediction.passLikelihood >= 75
                    ? "stroke-green-500"
                    : prediction.passLikelihood >= 65
                    ? "stroke-yellow-500"
                    : prediction.passLikelihood >= 50
                    ? "stroke-orange-500"
                    : "stroke-red-500"
                }`}
                strokeWidth="12"
                strokeDasharray={`${(prediction.passLikelihood / 100) * 440} 440`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getScoreColor(prediction.passLikelihood)}`}>
                {prediction.passLikelihood}%
              </span>
              <span className="text-sm text-muted-foreground">Pass Likelihood</span>
            </div>
          </div>

          {/* Score Details */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Badge className={getRiskColor(prediction.riskLevel)}>
                {prediction.riskLevel === "low" && "On Track"}
                {prediction.riskLevel === "moderate" && "Needs Attention"}
                {prediction.riskLevel === "high" && "At Risk"}
                {prediction.riskLevel === "critical" && "Critical"}
              </Badge>
              <Badge variant="outline">
                Confidence: {prediction.confidenceLevel}
              </Badge>
            </div>

            <p className="text-muted-foreground mb-4">
              {prediction.passLikelihood >= 80 &&
                "Excellent! You're well-prepared for the NREMT exam. Keep up the great work!"}
              {prediction.passLikelihood >= 70 && prediction.passLikelihood < 80 &&
                "Good progress! Focus on your improvement areas to boost your chances."}
              {prediction.passLikelihood >= 60 && prediction.passLikelihood < 70 &&
                "You're on track but need additional preparation. Follow the recommendations below."}
              {prediction.passLikelihood < 60 &&
                "Additional preparation is strongly recommended. Work closely with your instructor."}
            </p>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Performance Trend:</span>
                {getTrendIcon(prediction.factors.recentTrend)}
                <span className="capitalize">{prediction.factors.recentTrend}</span>
              </div>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                Updated: {new Date(prediction.lastUpdated).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Factor Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Brain className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quiz Average</p>
              <p className={`text-xl font-bold ${getScoreColor(prediction.factors.quizAverage)}`}>
                {Math.round(prediction.factors.quizAverage)}%
              </p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${prediction.factors.quizAverage}%` }}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Skill Pass Rate</p>
              <p className={`text-xl font-bold ${getScoreColor(prediction.factors.skillPassRate)}`}>
                {Math.round(prediction.factors.skillPassRate)}%
              </p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${prediction.factors.skillPassRate}%` }}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clinical Hours</p>
              <p className="text-xl font-bold">
                {prediction.factors.clinicalHoursCompleted}/{prediction.factors.clinicalHoursRequired}
              </p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{
                width: `${Math.min(
                  (prediction.factors.clinicalHoursCompleted / Math.max(prediction.factors.clinicalHoursRequired, 1)) * 100,
                  100
                )}%`
              }}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Course Progress</p>
              <p className={`text-xl font-bold ${getScoreColor(prediction.factors.courseCompletionRate)}`}>
                {Math.round(prediction.factors.courseCompletionRate)}%
              </p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${prediction.factors.courseCompletionRate}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Strengths & Areas for Improvement */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Your Strengths
          </h3>
          {prediction.strongAreas.length > 0 ? (
            <ul className="space-y-2">
              {prediction.strongAreas.map((area, i) => (
                <li key={i} className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  {area}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Keep working - your strengths will be identified as you progress!
            </p>
          )}
        </Card>

        {/* Areas for Improvement */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Areas for Improvement
          </h3>
          {prediction.improvementAreas.length > 0 ? (
            <ul className="space-y-2">
              {prediction.improvementAreas.map((area, i) => (
                <li key={i} className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="h-4 w-4" />
                  {area}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              Great job! No major areas of concern identified.
            </p>
          )}
        </Card>
      </div>

      {/* Personalized Recommendations */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Personalized Recommendations
        </h3>
        {prediction.recommendations.length > 0 ? (
          <div className="space-y-4">
            {prediction.recommendations.map((rec, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border-l-4 ${
                  rec.priority === "high"
                    ? "border-l-red-500 bg-red-50"
                    : rec.priority === "medium"
                    ? "border-l-yellow-500 bg-yellow-50"
                    : "border-l-blue-500 bg-blue-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          rec.priority === "high"
                            ? "destructive"
                            : rec.priority === "medium"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {rec.priority} priority
                      </Badge>
                      <Badge variant="outline">{rec.category}</Badge>
                    </div>
                    <p className="font-medium">{rec.action}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm text-muted-foreground">Est. Impact</p>
                    <p className="font-bold text-green-600">+{rec.estimatedImpact}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            You're doing great! Continue with your current study plan.
          </p>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/student/skill-sheets">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Practice Skills</p>
                  <p className="text-sm text-muted-foreground">NREMT Skill Sheets</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        </Link>

        <Link href="/student/adaptive-test">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Practice Questions</p>
                  <p className="text-sm text-muted-foreground">Adaptive Test</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        </Link>

        <Link href="/student/clinical">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Stethoscope className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Log Clinical</p>
                  <p className="text-sm text-muted-foreground">Hours & Contacts</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Disclaimer */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">About This Prediction</p>
            <p>
              This prediction is based on your performance data and industry research on NREMT success factors.
              It is meant to guide your study efforts, not guarantee results. Your actual exam performance
              may vary based on many factors including test-day conditions and individual circumstances.
              Work closely with your instructors for personalized guidance.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
