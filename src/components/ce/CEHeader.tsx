"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { BookOpen, LogOut } from "lucide-react";

interface CEHeaderUser {
  id: string;
  first_name: string;
  last_name: string;
}

export function CEHeader() {
  const pathname = usePathname();
  const [ceUser, setCeUser] = useState<CEHeaderUser | null | "loading">("loading");

  useEffect(() => {
    const check = async () => {
      try {
        const supabase = createCEClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setCeUser(null); return; }
        const { data } = await supabase
          .from("ce_users")
          .select("id, first_name, last_name")
          .eq("id", user.id)
          .single();
        setCeUser(data || null);
      } catch {
        setCeUser(null);
      }
    };
    check();
  }, []);

  const handleSignOut = async () => {
    const supabase = createCEClient();
    await supabase.auth.signOut();
    window.location.href = "/ce/login";
  };

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="bg-white border-b px-6 py-3 flex items-center justify-between text-gray-900">
      <div className="flex items-center gap-6">
        <Link href="/ce" className="flex items-center gap-2 font-bold text-red-700 shrink-0">
          <BookOpen className="h-5 w-5" />
          <span className="hidden sm:inline">MedicForge CE</span>
        </Link>
        <Link
          href="/ce/catalog"
          className={`text-sm transition-colors ${isActive("/ce/catalog") ? "text-red-700 font-medium" : "text-gray-600 hover:text-gray-900"}`}
        >
          Course Catalog
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {ceUser === "loading" ? (
          <div className="w-16 h-4 bg-gray-100 rounded animate-pulse" />
        ) : ceUser ? (
          <>
            <Link
              href="/ce/my-training"
              className={`text-sm transition-colors hidden md:inline ${isActive("/ce/my-training") ? "text-red-700 font-medium" : "text-gray-600 hover:text-gray-900"}`}
            >
              My Training
            </Link>
            <Link
              href="/ce/transcript"
              className={`text-sm transition-colors hidden md:inline ${isActive("/ce/transcript") ? "text-red-700 font-medium" : "text-gray-600 hover:text-gray-900"}`}
            >
              Transcript
            </Link>
            <Link
              href="/ce/account"
              className={`text-sm transition-colors hidden md:inline ${isActive("/ce/account") ? "text-red-700 font-medium" : "text-gray-600 hover:text-gray-900"}`}
            >
              Account
            </Link>
            <span className="text-sm text-gray-500 hidden lg:inline">
              {ceUser.first_name} {ceUser.last_name}
            </span>
            <button
              onClick={handleSignOut}
              className="text-gray-500 hover:text-red-700 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <Link href="/ce/login" className="text-sm text-gray-600 hover:text-gray-900">
              Sign In
            </Link>
            <Link
              href="/ce/register"
              className="bg-red-700 text-white text-sm px-3 py-1.5 rounded-md hover:bg-red-800 transition-colors"
            >
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
