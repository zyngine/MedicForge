"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { BookOpen, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ui";

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
    <nav className="bg-card border-b border-border px-6 py-3 flex items-center justify-between text-card-foreground">
      <div className="flex items-center gap-6">
        <Link href="/ce" className="flex items-center gap-2 font-bold text-primary shrink-0">
          <BookOpen className="h-5 w-5" />
          <span className="hidden sm:inline">MedicForge CE</span>
        </Link>
        <Link
          href="/ce/catalog"
          className={`text-sm transition-colors ${isActive("/ce/catalog") ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
        >
          Course Catalog
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {ceUser === "loading" ? (
          <div className="w-16 h-4 bg-muted rounded animate-pulse" />
        ) : ceUser ? (
          <>
            <Link
              href="/ce/my-training"
              className={`text-sm transition-colors hidden md:inline ${isActive("/ce/my-training") ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              My Training
            </Link>
            <Link
              href="/ce/transcript"
              className={`text-sm transition-colors hidden md:inline ${isActive("/ce/transcript") ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              Transcript
            </Link>
            <Link
              href="/ce/account"
              className={`text-sm transition-colors hidden md:inline ${isActive("/ce/account") ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              Account
            </Link>
            <span className="text-sm text-muted-foreground hidden lg:inline">
              {ceUser.first_name} {ceUser.last_name}
            </span>
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <Link href="/ce/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
            <ThemeToggle />
            <Link
              href="/ce/register"
              className="bg-primary text-primary-foreground text-sm px-3 py-1.5 rounded-md hover:opacity-90 transition-colors"
            >
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
