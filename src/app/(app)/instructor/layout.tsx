"use client";

import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts";
import { useUser } from "@/lib/hooks/use-user";
import { Spinner } from "@/components/ui";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Users,
  BarChart3,
  Calendar,
  Settings,
  Stethoscope,
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
    title: "Students",
    href: "/instructor/students",
    icon: <Users className="h-5 w-5" />,
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
    <DashboardLayout
      user={user}
      navigation={instructorNavigation}
      portalName="Instructor Portal"
      onSignOut={handleSignOut}
    >
      {children}
    </DashboardLayout>
  );
}
