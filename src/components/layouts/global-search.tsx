"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, BookOpen, Users, X } from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { createClient } from "@/lib/supabase/client";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  type: "course" | "user";
}

interface GlobalSearchProps {
  userRole?: string;
}

export function GlobalSearch({ userRole }: GlobalSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const router = useRouter();
  const { tenant } = useTenant();
  const tenantId = tenant?.id;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  // Keyboard shortcut to open
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
    }
  }, [open]);

  // Debounced search
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || !tenantId) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      const combined: SearchResult[] = [];

      try {
        // Search courses for admin, instructor, or student
        if (
          userRole === "admin" ||
          userRole === "instructor" ||
          userRole === "student"
        ) {
          const { data: courses } = await (supabase as any)
            .from("courses")
            .select("id, title")
            .ilike("title", `%${query}%`)
            .eq("tenant_id", tenantId)
            .limit(5);

          if (courses) {
            const hrefPrefix =
              userRole === "admin"
                ? "/admin/courses/library"
                : userRole === "instructor"
                ? "/instructor/courses"
                : "/student/courses";

            for (const c of courses) {
              combined.push({
                id: c.id,
                label: c.title,
                href: `${hrefPrefix}/${c.id}`,
                type: "course",
              });
            }
          }
        }

        // Search users for admin only
        if (userRole === "admin") {
          const safeQuery = query.replace(/[%_\\,()]/g, c => '\\' + c);
          const { data: users } = await (supabase as any)
            .from("users")
            .select("id, full_name, email")
            .or(`full_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`)
            .eq("tenant_id", tenantId)
            .limit(5);

          if (users) {
            for (const u of users) {
              combined.push({
                id: u.id,
                label: u.full_name ?? u.email,
                sublabel: u.full_name ? u.email : undefined,
                href: "/admin/users",
                type: "user",
              });
            }
          }
        }
      } catch (_err) {
        // silently fail
      }

      setResults(combined);
      setActiveIndex(-1);
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tenantId, userRole]);

  function handleKeyNavigation(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        navigate(results[activeIndex].href);
      }
    }
  }

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  const kbdLabel = isMac ? "\u2318K" : "Ctrl+K";

  return (
    <>
      {/* Trigger button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md w-64 cursor-pointer hover:bg-muted/80 transition-colors"
      >
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground flex-1">Search...</span>
        <kbd className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded shrink-0">
          {kbdLabel}
        </kbd>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          {/* Card */}
          <div className="relative w-full max-w-lg bg-popover border rounded-xl shadow-2xl overflow-hidden">
            {/* Search input row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyNavigation}
                placeholder="Search courses, users..."
                className="flex-1 bg-transparent border-none outline-none text-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-muted rounded ml-1"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                  Searching...
                </div>
              )}

              {!loading && query.trim() && results.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                  No results found for &quot;{query}&quot;
                </div>
              )}

              {!loading && results.length > 0 && (
                <ul className="py-2">
                  {results.map((result, idx) => (
                    <li key={`${result.type}-${result.id}`}>
                      <button
                        onClick={() => navigate(result.href)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                          idx === activeIndex
                            ? "bg-muted text-foreground"
                            : "text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <span className="shrink-0 text-muted-foreground">
                          {result.type === "course" ? (
                            <BookOpen className="h-4 w-4" />
                          ) : (
                            <Users className="h-4 w-4" />
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate font-medium">
                            {result.label}
                          </span>
                          {result.sublabel && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {result.sublabel}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground capitalize">
                          {result.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!query.trim() && (
                <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                  Type to search courses
                  {userRole === "admin" ? " and users" : ""}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                <kbd className="bg-muted px-1 rounded">&#8593;&#8595;</kbd>{" "}
                navigate
              </span>
              <span>
                <kbd className="bg-muted px-1 rounded">&#9166;</kbd> select
              </span>
              <span>
                <kbd className="bg-muted px-1 rounded">Esc</kbd> close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
