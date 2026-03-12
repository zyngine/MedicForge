"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { CEHeader } from "@/components/ce/CEHeader";
import { BookOpen, Clock, Award, Search, SlidersHorizontal } from "lucide-react";

interface CECourse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  ceh_hours: number;
  course_type: string | null;
  delivery_method: string | null;
  is_free: boolean;
  price: number | null;
  capce_approved: boolean;
  target_audience: string[] | null;
}

const CATEGORIES = [
  "All",
  "Airway",
  "Cardiology",
  "Trauma",
  "Medical",
  "Operations",
  "Pediatric",
  "OB/Gynecology",
  "Behavioral",
  "Hazmat",
  "EMS Operations",
];

const DELIVERY_LABELS: Record<string, string> = {
  online_self_paced: "Self-Paced",
  online_live: "Live Online",
  blended: "Blended",
  in_person: "In Person",
};

export default function CECatalogPage() {
  const [allCourses, setAllCourses] = useState<CECourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [capceOnly, setCapceOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data } = await supabase
        .from("ce_courses")
        .select(
          "id, title, description, category, ceh_hours, course_type, delivery_method, is_free, price, capce_approved, target_audience"
        )
        .eq("status", "published")
        .order("title");
      setAllCourses(data || []);
      setIsLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return allCourses.filter((c) => {
      if (category !== "All" && c.category !== category) return false;
      if (capceOnly && !c.capce_approved) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const inTitle = c.title.toLowerCase().includes(s);
        const inDesc = (c.description || "").toLowerCase().includes(s);
        const inCategory = (c.category || "").toLowerCase().includes(s);
        if (!inTitle && !inDesc && !inCategory) return false;
      }
      return true;
    });
  }, [allCourses, category, capceOnly, search]);

  const hasActiveFilters = category !== "All" || capceOnly || search.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <CEHeader />

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Course Catalog</h1>
            <p className="text-muted-foreground mt-1">
              Browse EMS continuing education courses
              {!isLoading && ` · ${allCourses.length} course${allCourses.length !== 1 ? "s" : ""} available`}
            </p>
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm border transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-red-50 border-red-300 text-red-700"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-red-700 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {[category !== "All", capceOnly, search.trim().length > 0].filter(Boolean).length}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(""); setCategory("All"); setCapceOnly(false); }}
              className="text-sm text-gray-500 hover:text-gray-900 px-2"
            >
              Clear
            </button>
          )}
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="bg-white border rounded-lg p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      category === c
                        ? "bg-red-700 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1 border-t">
              <button
                onClick={() => setCapceOnly((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  capceOnly
                    ? "bg-blue-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                CAPCE Approved Only
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            {hasActiveFilters ? (
              <>
                <p className="font-medium mb-1">No courses match your filters</p>
                <button
                  onClick={() => { setSearch(""); setCategory("All"); setCapceOnly(false); }}
                  className="text-sm text-red-700 hover:underline"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <p>No courses available yet. Check back soon.</p>
            )}
          </div>
        ) : (
          <>
            {hasActiveFilters && (
              <p className="text-sm text-muted-foreground">
                Showing {filtered.length} of {allCourses.length} courses
              </p>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((course) => (
                <Link key={course.id} href={`/ce/course/${course.id}`}>
                  <div className="bg-white border rounded-lg p-5 hover:shadow-md transition-shadow h-full flex flex-col">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {course.category && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {course.category}
                        </span>
                      )}
                      {course.capce_approved && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          CAPCE
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="font-semibold text-base leading-snug mb-2 flex-1">
                      {course.title}
                    </h2>

                    {/* Description */}
                    {course.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {course.description}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {course.ceh_hours}h CEH
                        </span>
                        {course.delivery_method && (
                          <span className="hidden sm:inline">
                            {DELIVERY_LABELS[course.delivery_method] || course.delivery_method}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-red-700">
                        {course.is_free || !course.price ? "Free" : `$${course.price.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t px-6 py-6 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Summers Digital LLC · <Link href="/ce/terms" className="hover:underline">Terms</Link> · <Link href="/ce/privacy" className="hover:underline">Privacy</Link></p>
      </footer>
    </div>
  );
}
