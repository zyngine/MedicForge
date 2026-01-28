"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layouts";
import { Button, Alert, Card, CardHeader, CardContent } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, Stethoscope, ArrowRight } from "lucide-react";

const DEMO_ACCOUNTS = {
  instructor: {
    email: "demo.instructor@medicforge.com",
    password: "DemoPass123!",
    name: "Dr. Sarah Johnson",
    description: "Experience the instructor portal with course management, grading, and student tracking.",
  },
  student: {
    email: "demo.student@medicforge.com",
    password: "DemoPass123!",
    name: "Michael Chen",
    description: "Explore the student experience with courses, assignments, and clinical tracking.",
  },
};

export default function DemoLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState<"instructor" | "student" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleDemoLogin = async (role: "instructor" | "student") => {
    setIsLoading(role);
    setError(null);

    try {
      const supabase = createClient();

      // Sign out any existing session first to prevent stale session issues
      await supabase.auth.signOut({ scope: 'local' });

      const account = DEMO_ACCOUNTS[role];

      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Use hard redirect to ensure clean state
      if (role === "instructor") {
        window.location.href = "/instructor/dashboard";
      } else {
        window.location.href = "/student/dashboard";
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <AuthLayout
      title="Try MedicForge"
      description="Explore our platform with a demo account - no signup required"
    >
      <div className="space-y-6">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="grid gap-4">
          {/* Instructor Demo */}
          <Card className="relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Instructor Demo</h3>
                  <p className="text-sm text-muted-foreground">{DEMO_ACCOUNTS.instructor.name}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {DEMO_ACCOUNTS.instructor.description}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Manage courses and content</li>
                <li>• Grade assignments with curves</li>
                <li>• Track student competencies</li>
              </ul>
              <Button
                className="w-full"
                onClick={() => handleDemoLogin("instructor")}
                isLoading={isLoading === "instructor"}
                disabled={isLoading !== null}
              >
                Login as Instructor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Student Demo */}
          <Card className="relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Student Demo</h3>
                  <p className="text-sm text-muted-foreground">{DEMO_ACCOUNTS.student.name}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {DEMO_ACCOUNTS.student.description}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Access course materials</li>
                <li>• Complete assignments & quizzes</li>
                <li>• Track clinical hours</li>
              </ul>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleDemoLogin("student")}
                isLoading={isLoading === "student"}
                disabled={isLoading !== null}
              >
                Login as Student
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-2 text-muted-foreground">
              Or create your own account
            </span>
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => router.push("/login")}
          >
            Sign In
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => router.push("/register")}
          >
            Register
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Demo accounts are reset periodically. Data created in demo mode may be deleted.
        </p>
      </div>
    </AuthLayout>
  );
}
