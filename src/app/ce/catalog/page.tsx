"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Badge } from "@/components/ui";
import { BookOpen, Clock, Award, ChevronRight } from "lucide-react";

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
  const [courses, setCourses] = useState<CECourse[]>([]);
  const [category, setCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const supabase = createCEClient();
      let q = supabase
        .from("ce_courses")
        .select(
          "id, title, description, category, ceh_hours, course_type, delivery_method, is_free, price, capce_approved, target_audience"
        )
        .eq("status", "published")
        .order("title");

      if (category !== "All") q = q.eq("category", category);

      const { data } = await q;
      setCourses(data || []);
      setIsLoading(false);
    };
    load();
  }, [category]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Course Catalog</h1>
        <p className="text-muted-foreground mt-1">
          Browse EMS continuing education courses
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              category === c
                ? "bg-red-700 text-white"
                : "bg-white border text-gray-600 hover:bg-gray-50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Course grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No courses available in this category yet.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <Link key={course.id} href={`/ce/course/${course.id}`}>
              <div className="bg-white border rounded-lg p-5 hover:shadow-md transition-shadow h-full flex flex-col">
                {/* Category + CAPCE */}
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
                      {course.ceh_hours}h
                    </span>
                    {course.delivery_method && (
                      <span>{DELIVERY_LABELS[course.delivery_method] || course.delivery_method}</span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-red-700">
                    {course.is_free ? "Free" : course.price ? `$${course.price.toFixed(2)}` : "Free"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
