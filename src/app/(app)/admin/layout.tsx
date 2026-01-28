"use client";

import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layouts";
import { useUser } from "@/lib/hooks/use-user";
import { Spinner } from "@/components/ui";
import { SubscriptionGate } from "@/components/subscription";
import {
  LayoutDashboard,
  Users,
  Settings,
  CreditCard,
  Building2,
  BarChart3,
  Stethoscope,
  ClipboardList,
  Database,
} from "lucide-react";

const adminNavigation = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Organization",
    href: "/admin/organization",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    title: "Clinical Sites",
    href: "/admin/clinical-sites",
    icon: <Stethoscope className="h-5 w-5" />,
  },
  {
    title: "Exams & Templates",
    href: "/instructor/exams",
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    title: "Question Bank",
    href: "/instructor/question-bank",
    icon: <Database className="h-5 w-5" />,
  },
  {
    title: "Billing",
    href: "/admin/billing",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { profile, isLoading, signOut } = useUser();

  const handleSignOut = async () => {
    await signOut();
    // Use hard redirect to ensure full page reload and clear all cached state
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const user = {
    name: profile?.full_name || "Admin",
    email: profile?.email || "",
    role: profile?.role || "admin",
    avatar: profile?.avatar_url || undefined,
  };

  return (
    <SubscriptionGate>
      <DashboardLayout
        user={user}
        navigation={adminNavigation}
        portalName="Admin Portal"
        onSignOut={handleSignOut}
      >
        {children}
      </DashboardLayout>
    </SubscriptionGate>
  );
}
