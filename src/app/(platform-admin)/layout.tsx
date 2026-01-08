"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/layouts";
import { usePlatformAdmin } from "@/lib/hooks/use-platform-admin";
import { Spinner } from "@/components/ui";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  BarChart3,
  Users,
  Settings,
  Shield,
} from "lucide-react";

const platformAdminNavigation = [
  {
    title: "Dashboard",
    href: "/platform-admin/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "Institutions",
    href: "/platform-admin/tenants",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    title: "Subscriptions",
    href: "/platform-admin/subscriptions",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    title: "All Users",
    href: "/platform-admin/users",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Analytics",
    href: "/platform-admin/analytics",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "Platform Admins",
    href: "/platform-admin/admins",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    title: "Settings",
    href: "/platform-admin/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

export default function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isPlatformAdmin, isLoading } = usePlatformAdmin();

  useEffect(() => {
    if (!isLoading && !isPlatformAdmin) {
      router.push("/login");
    }
  }, [isLoading, isPlatformAdmin, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don&apos;t have permission to access this area.</p>
        </div>
      </div>
    );
  }

  const adminUser = {
    name: user?.user_metadata?.full_name || "Platform Admin",
    email: user?.email || "",
    role: "platform_admin" as const,
    avatar: undefined,
  };

  return (
    <DashboardLayout
      user={adminUser}
      navigation={platformAdminNavigation}
      portalName="Platform Admin"
    >
      {children}
    </DashboardLayout>
  );
}
