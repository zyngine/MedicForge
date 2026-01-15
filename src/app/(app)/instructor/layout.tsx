"use client";

import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts";
import { useUser } from "@/lib/hooks/use-user";
import { Spinner } from "@/components/ui";
import { SubscriptionGate } from "@/components/subscription";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Users,
  BarChart3,
  Calendar,
  Settings,
  Stethoscope,
  Database,
  FileCheck,
  Target,
  GraduationCap,
  Shield,
  PieChart,
  FileText,
  Brain,
  ClipboardCheck,
} from "lucide-react";

const instructorNavigation = [
  {
    title: "Dashboard",
    href: "/instructor/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "My Courses",
    href: "/instructor/courses",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    title: "Grading",
    href: "/instructor/grading",
    icon: <ClipboardList className="h-5 w-5" />,
    badge: 12,
  },
  {
    title: "Gradebook",
    href: "/instructor/gradebook",
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    title: "Students",
    href: "/instructor/students",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Question Bank",
    href: "/instructor/question-bank",
    icon: <Database className="h-5 w-5" />,
  },
  {
    title: "Exams & CAT",
    href: "/instructor/exams",
    icon: <Brain className="h-5 w-5" />,
  },
  {
    title: "Skill Sheets",
    href: "/instructor/skill-sheets",
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    title: "Rubrics",
    href: "/instructor/rubrics",
    icon: <FileCheck className="h-5 w-5" />,
  },
  {
    title: "Outcomes",
    href: "/instructor/outcomes",
    icon: <Target className="h-5 w-5" />,
  },
  {
    title: "Plagiarism",
    href: "/instructor/plagiarism",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    title: "Analytics",
    href: "/instructor/analytics",
    icon: <PieChart className="h-5 w-5" />,
  },
  {
    title: "Reports",
    href: "/instructor/reports",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "Clinical",
    href: "/instructor/clinical",
    icon: <Stethoscope className="h-5 w-5" />,
  },
  {
    title: "Patient Contacts",
    href: "/instructor/clinical/patient-contacts",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: "Calendar",
    href: "/instructor/calendar",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    title: "Settings",
    href: "/instructor/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { profile, isLoading, signOut } = useUser();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const user = {
    name: profile?.full_name || "Instructor",
    email: profile?.email || "",
    role: profile?.role || "instructor",
    avatar: profile?.avatar_url || undefined,
  };

  return (
    <SubscriptionGate>
      <DashboardLayout
        user={user}
        navigation={instructorNavigation}
        portalName="Instructor Portal"
        onSignOut={handleSignOut}
      >
        {children}
      </DashboardLayout>
    </SubscriptionGate>
  );
}
