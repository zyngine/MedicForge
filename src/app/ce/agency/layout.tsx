"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner, ThemeToggle } from "@/components/ui";
import { BookOpen, LayoutDashboard, Users, BarChart3, Settings, LogOut, Upload, Shield } from "lucide-react";

export default function CEAgencyLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [agencyName, setAgencyName] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/ce/login");
        return;
      }

      const { data: ceUser } = await supabase
        .from("ce_users")
        .select("id, first_name, last_name, role, agency_id")
        .eq("id", user.id)
        .single();

      if (!ceUser || ceUser.role !== "agency_admin") {
        router.push("/ce");
        return;
      }

      if (ceUser.agency_id) {
        const { data: agency } = await supabase
          .from("ce_agencies")
          .select("name")
          .eq("id", ceUser.agency_id)
          .single();
        if (agency) setAgencyName(agency.name);
      }

      setIsLoading(false);
    };

    checkAccess();
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

  const navItems = [
    { href: "/ce/agency", label: "Dashboard", icon: LayoutDashboard },
    { href: "/ce/agency/employees", label: "Employees", icon: Users },
    { href: "/ce/agency/training", label: "Assign Training", icon: BookOpen },
    { href: "/ce/agency/custom", label: "Custom Training", icon: Upload },
    { href: "/ce/agency/compliance", label: "Compliance", icon: Shield },
    { href: "/ce/agency/reports", label: "Reports", icon: BarChart3 },
    { href: "/ce/agency/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar — always dark regardless of theme */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800">
          <Link href="/ce/agency" className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-red-400" />
            <div>
              <p className="font-bold text-sm">MedicForge CE</p>
              <p className="text-xs text-gray-400 truncate">{agencyName || "Agency Portal"}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
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
        </nav>

        <div className="p-3 border-t border-gray-800">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-3 py-2 w-full rounded-md hover:bg-gray-800"
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
