"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { BookOpen, GraduationCap, FileText, User, LogOut, Bell } from "lucide-react";

interface CEUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  terms_accepted_at: string | null;
}

export default function CEUserLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ceUser, setCeUser] = useState<CEUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createCEClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/ce/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      const { data: ceUserData } = await supabase
        .from("ce_users")
        .select("id, first_name, last_name, email, role, terms_accepted_at")
        .eq("id", user.id)
        .single();

      if (!ceUserData) {
        // Authenticated with Supabase but no CE profile
        await supabase.auth.signOut();
        router.push("/ce/login");
        return;
      }

      if (!ceUserData.terms_accepted_at) {
        router.push(`/ce/terms?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      setCeUser(ceUserData);
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

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
    { href: "/ce/my-training", label: "My Training", icon: GraduationCap },
    { href: "/ce/catalog", label: "Catalog", icon: BookOpen },
    { href: "/ce/transcript", label: "Transcript", icon: FileText },
    { href: "/ce/account", label: "Account", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/ce" className="flex items-center gap-2 font-bold text-red-700">
            <BookOpen className="h-5 w-5" />
            <span>MedicForge CE</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-red-50 text-red-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="text-gray-500 hover:text-gray-700">
            <Bell className="h-5 w-5" />
          </button>
          <div className="text-sm text-right hidden sm:block">
            <p className="font-medium">
              {ceUser?.first_name} {ceUser?.last_name}
            </p>
            <p className="text-muted-foreground text-xs">{ceUser?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-gray-500 hover:text-red-700 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 bg-white border-b overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-red-50 text-red-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
