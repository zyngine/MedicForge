"use client";

import { DashboardLayout } from "@/components/layouts";
import { useUser } from "@/lib/hooks/use-user";
import { Spinner } from "@/components/ui";
import {
  LayoutDashboard,
  Users,
  Settings,
  CreditCard,
  Building2,
  BarChart3,
  Stethoscope,
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
  const { profile, isLoading } = useUser();

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
    <DashboardLayout
      user={user}
      navigation={adminNavigation}
      portalName="Admin Portal"
    >
      {children}
    </DashboardLayout>
  );
}
