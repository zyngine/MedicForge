"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner, ThemeToggle } from "@/components/ui";
import {
  BookOpen, LayoutDashboard, GraduationCap, Users, Building2,
  BarChart3, Users2, LogOut, Settings, CreditCard,
} from "lucide-react";

export default function CEAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("");

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/ce/login");
        return;
      }

      const { data: ceUser } = await supabase
        .from("ce_users")
        .select("id, first_name, last_name, role")
        .eq("id", user.id)
        .single();

      if (!ceUser || ceUser.role !== "admin") {
        router.push("/ce");
        return;
      }

      setAdminName(`${ceUser.first_name} ${ceUser.last_name}`);
      setIsLoading(false);
    };

    checkAdmin();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createCEClient();
    await supabase.auth.signOut();
    router.push("/ce/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const navSections = [
    {
      label: "Overview",
      items: [
        { href: "/ce/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/ce/admin/analytics", label: "Analytics", icon: BarChart3 },
      ],
    },
    {
      label: "Content",
      items: [
        { href: "/ce/admin/courses", label: "Courses", icon: BookOpen },
        { href: "/ce/admin/instructors", label: "Instructors", icon: GraduationCap },
      ],
    },
    {
      label: "Program Committee",
      items: [
        { href: "/ce/admin/committee", label: "Committee Dashboard", icon: Users2 },
        { href: "/ce/admin/committee/members", label: "Members", icon: Users },
        { href: "/ce/admin/committee/meetings", label: "Meetings", icon: LayoutDashboard },
        { href: "/ce/admin/committee/reviews", label: "Course Reviews", icon: BookOpen },
        { href: "/ce/admin/committee/coi", label: "COI Forms", icon: Users },
        { href: "/ce/admin/committee/needs-assessment", label: "Needs Assessment", icon: BarChart3 },
        { href: "/ce/admin/committee/documents", label: "Documents", icon: BookOpen },
      ],
    },
    {
      label: "Users & Agencies",
      items: [
        { href: "/ce/admin/users", label: "All Users", icon: Users },
        { href: "/ce/admin/agencies", label: "Agencies", icon: Building2 },
      ],
    },
    {
      label: "CAPCE",
      items: [
        { href: "/ce/admin/capce", label: "CAPCE Dashboard", icon: LayoutDashboard },
        { href: "/ce/admin/capce/reporting", label: "Reporting", icon: BarChart3 },
        { href: "/ce/admin/capce/submissions", label: "Submissions", icon: BookOpen },
        { href: "/ce/admin/capce/audit", label: "Audit Prep", icon: Users },
      ],
    },
    {
      label: "Platform",
      items: [
        { href: "/ce/admin/billing", label: "Billing", icon: CreditCard },
        { href: "/ce/admin/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar — always dark regardless of theme */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800">
          <Link href="/ce/admin" className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-red-400" />
            <div>
              <p className="font-bold text-sm">MedicForge CE</p>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">
                {section.label}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-red-700 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="text-sm text-gray-400 mb-2 px-2">{adminName}</div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-2 py-1.5 w-full rounded-md hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content — theme-aware */}
      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="flex items-center justify-end px-8 pt-4">
          <ThemeToggle />
        </div>
        <div className="px-8 pb-8">{children}</div>
      </main>
    </div>
  );
}
