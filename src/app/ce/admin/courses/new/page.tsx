"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Input, Button, Alert, Select, Spinner } from "@/components/ui";
import { ArrowLeft } from "lucide-react";

const CATEGORIES = [
  "Airway", "Cardiology", "Trauma", "Medical", "Operations",
  "Pediatric", "OB/Gynecology", "Behavioral", "Hazmat", "EMS Operations",
];

const COURSE_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "refresher", label: "Refresher" },
  { value: "protocol_update", label: "Protocol Update" },
  { value: "skills", label: "Skills-Based" },
];

const DELIVERY_METHODS = [
  { value: "online_self_paced", label: "Online — Self-Paced" },
  { value: "online_live", label: "Online — Live" },
  { value: "blended", label: "Blended" },
  { value: "in_person", label: "In Person" },
];

export default function CEAdminNewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [cehHours, setCehHours] = useState("1.0");
  const [courseType, setCourseType] = useState("standard");
  const [deliveryMethod, setDeliveryMethod] = useState("online_self_paced");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    const hours = parseFloat(cehHours);
    if (isNaN(hours) || hours <= 0) { setError("CEH hours must be a positive number."); return; }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createCEClient();
      const { data: user } = await supabase.auth.getUser();

      const { data, error: insertError } = await supabase
        .from("ce_courses")
        .insert({
          title: title.trim(),
          category: category || null,
          ceh_hours: hours,
          course_type: courseType,
          delivery_method: deliveryMethod,
          is_free: isFree,
          price: isFree ? null : (price ? parseFloat(price) : null),
          status: "draft",
          created_by: user.user?.id ?? null,
        })
        .select("id")
        .single();

      if (insertError) {
        setError("Failed to create course. Please try again.");
        return;
      }

      router.push(`/ce/admin/courses/${data.id}`);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ce/admin/courses" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create New Course</h1>
          <p className="text-muted-foreground text-sm">Start with the basics — you can add full content after creating.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Course Title <span className="text-red-600">*</span></label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Advanced Airway Management"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={category}
                  onChange={(v) => setCategory(v)}
                  options={[
                    { value: "", label: "Select category..." },
                    ...CATEGORIES.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">CEH Hours <span className="text-red-600">*</span></label>
                <Input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={cehHours}
                  onChange={(e) => setCehHours(e.target.value)}
                  placeholder="1.0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Course Type</label>
                <Select
                  value={courseType}
                  onChange={(v) => setCourseType(v)}
                  options={COURSE_TYPES}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Delivery Method</label>
                <Select
                  value={deliveryMethod}
                  onChange={(v) => setDeliveryMethod(v)}
                  options={DELIVERY_METHODS}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pricing</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isFree}
                    onChange={() => setIsFree(true)}
                    className="accent-red-700"
                  />
                  <span className="text-sm">Free</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isFree}
                    onChange={() => setIsFree(false)}
                    className="accent-red-700"
                  />
                  <span className="text-sm">Paid</span>
                </label>
                {!isFree && (
                  <div className="relative flex-1 max-w-[120px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="9.99"
                      className="pl-7"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2"><Spinner size="sm" />Creating...</span>
                ) : (
                  "Create Course"
                )}
              </Button>
              <Link href="/ce/admin/courses">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
