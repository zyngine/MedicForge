"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  Button,
  Input,
  Checkbox,
  Spinner,
  Alert,
} from "@/components/ui";
import { ArrowLeft, Search, UserPlus, CheckCircle } from "lucide-react";
import {
  useCohort,
  useCohortMembers,
  useStudents,
} from "@/lib/hooks/use-cohorts";

export default function CohortEnrollPage() {
  const params = useParams();
  const router = useRouter();
  const cohortId = params.cohortId as string;

  const { cohort, isLoading: cohortLoading } = useCohort(cohortId);
  const { members, isLoading: membersLoading } = useCohortMembers(cohortId);
  const { students, isLoading: studentsLoading } = useStudents();
  const { addMembers, isAdding } = useCohortMembers(cohortId);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Students who aren't already in the cohort
  const enrolledIds = useMemo(
    () => new Set(members.map((m) => m.student_id)),
    [members],
  );
  const eligible = useMemo(
    () => students.filter((s) => !enrolledIds.has(s.id)),
    [students, enrolledIds],
  );
  const filtered = useMemo(() => {
    if (!search.trim()) return eligible;
    const q = search.toLowerCase();
    return eligible.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q),
    );
  }, [eligible, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setError(null);
    try {
      await addMembers(Array.from(selected));
      router.push(`/admin/cohorts/${cohortId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add students");
    }
  };

  const isLoading = cohortLoading || membersLoading || studentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <p className="text-muted-foreground">Cohort not found.</p>
        <Button asChild className="mt-4">
          <Link href="/admin/cohorts">Back to cohorts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href={`/admin/cohorts/${cohortId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {cohort.name}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Add Students to {cohort.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select students to enroll in this cohort. Students already in the cohort are hidden.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {filtered.length} available · {selected.size} selected
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={selectAllFiltered} disabled={filtered.length === 0}>
                Select all shown
              </Button>
              {selected.size > 0 && (
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {eligible.length === 0
                ? "Every student in your organization is already in this cohort."
                : "No students match your search."}
            </div>
          ) : (
            <div className="border rounded-lg divide-y max-h-[50vh] overflow-auto">
              {filtered.map((s) => {
                const isSelected = selected.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 ${
                      isSelected ? "bg-muted/40" : ""
                    }`}
                  >
                    <Checkbox checked={isSelected} onChange={() => toggle(s.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.full_name}</p>
                      {s.email && (
                        <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      )}
                    </div>
                    {isSelected && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                  </label>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => router.push(`/admin/cohorts/${cohortId}`)}>
          Cancel
        </Button>
        <Button onClick={handleAdd} disabled={selected.size === 0 || isAdding}>
          <UserPlus className="h-4 w-4 mr-2" />
          {isAdding
            ? "Adding…"
            : `Add ${selected.size} student${selected.size === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}
