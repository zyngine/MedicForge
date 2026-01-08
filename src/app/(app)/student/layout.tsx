"use client";

import { DashboardLayout } from "@/components/layouts";
import { useUser } from "@/lib/hooks/use-user";
import { Spinner } from "@/components/ui";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Award,
  Calendar,
  MessageSquare,
  Settings,
  Stethoscope,
} from "lucide-react";

const studentNavigation = [
  {
    title: "Dashboard",
    href: "/student/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "My Courses",
    href: "/student/courses",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    title: "Assignments",
    href: "/student/assignments",
    icon: <ClipboardList className="h-5 w-5" />,
    badge: 3,
  },
  {
    title: "Clinical Tracker",
    href: "/student/clinical",
    icon: <Stethoscope className="h-5 w-5" />,
  },
  {
    title: "Grades",
    href: "/student/grades",
    icon: <Award className="h-5 w-5" />,
  },
  {
    title: "Calendar",
    href: "/student/calendar",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    title: "Discussions",
    href: "/student/discussions",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    title: "Settings",
    href: "/student/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const user = {
    name: profile?.full_name || "Student",
    email: profile?.email || "",
    role: profile?.role || "student",
    avatar: profile?.avatar_url || undefined,
  };

  return (
    <DashboardLayout
      user={user}
      navigation={studentNavigation}
      portalName="Student Portal"
    >
      {children}
    </DashboardLayout>
  );
}
