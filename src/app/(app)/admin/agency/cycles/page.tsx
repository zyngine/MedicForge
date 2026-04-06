"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Spinner,
  Alert,
  Input,
  Select,
} from "@/components/ui";
import {
  useVerificationCycles,
  useCreateVerificationCycle,
  useActivateCycle,
  useCompleteCycle,
  useArchiveCycle,
  useCycleProgress,
  VerificationCycle,
} from "@/lib/hooks/use-verification-cycles";
import {
  Plus,
  Calendar,
  CalendarClock,
  Play,
  CheckCircle,
  Archive,
  MoreVertical,
  X,
  ArrowRight,
} from "lucide-react";

const CYCLE_TYPES = [
  { value: "initial", label: "Initial Verification" },
  { value: "annual", label: "Annual Verification" },
  { value: "remedial", label: "Remedial Training" },
];

export default function VerificationCyclesPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedCycle, setSelectedCycle] = React.useState<string | null>(null);
  const [showActions, setShowActions] = React.useState<string | null>(null);

  const { data: cycles, isLoading, error } = useVerificationCycles({
    includeArchived: statusFilter === "archived",
  });

  const activateCycle = useActivateCycle();
  const completeCycle = useCompleteCycle();
  const archiveCycle = useArchiveCycle();

  const filteredCycles = React.useMemo(() => {
    if (!cycles) return [];
    if (statusFilter === "all") return cycles.filter((c) => c.status !== "archived");
    return cycles.filter((c) => c.status === statusFilter);
  }, [cycles, statusFilter]);

  const _getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "active":
        return "default";
      case "completed":
        return "outline";
      case "archived":
        return "secondary";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Verification Cycles</h1>
          <p className="text-muted-foreground">
            Manage employee competency verification periods
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Cycle
        </Button>
      </div>

      {error && (
        <Alert variant="error">Failed to load verification cycles.</Alert>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {["all", "draft", "active", "completed", "archived"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Cycles List */}
      <div className="grid gap-4">
        {filteredCycles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No verification cycles</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create a verification cycle to track employee competencies
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                Create First Cycle
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredCycles.map((cycle) => (
            <CycleCard
              key={cycle.id}
              cycle={cycle}
              isExpanded={selectedCycle === cycle.id}
              onToggle={() => setSelectedCycle(selectedCycle === cycle.id ? null : cycle.id)}
              showActions={showActions === cycle.id}
              onToggleActions={() => setShowActions(showActions === cycle.id ? null : cycle.id)}
              onActivate={() => {
                activateCycle.mutate(cycle.id);
                setShowActions(null);
              }}
              onComplete={() => {
                completeCycle.mutate(cycle.id);
                setShowActions(null);
              }}
              onArchive={() => {
                archiveCycle.mutate(cycle.id);
                setShowActions(null);
              }}
            />
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateCycleModal
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

function CycleCard({
  cycle,
  isExpanded,
  onToggle,
  showActions,
  onToggleActions,
  onActivate,
  onComplete,
  onArchive,
}: {
  cycle: VerificationCycle;
  isExpanded: boolean;
  onToggle: () => void;
  showActions: boolean;
  onToggleActions: () => void;
  onActivate: () => void;
  onComplete: () => void;
  onArchive: () => void;
}) {
  const { data: progress, isLoading } = useCycleProgress(isExpanded ? cycle.id : null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "active":
        return "default";
      case "completed":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 cursor-pointer" onClick={onToggle}>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">{cycle.name}</h3>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Badge variant={getStatusColor(cycle.status) as any}>
                {cycle.status}
              </Badge>
              <Badge variant="outline">{cycle.cycle_type}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
              </span>
              {cycle.year && <span>Year: {cycle.year}</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={onToggleActions}>
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showActions && (
              <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-background border z-10">
                <div className="py-1">
                  <Link
                    href={`/admin/agency/cycles/${cycle.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                  >
                    <ArrowRight className="h-4 w-4" />
                    View Details
                  </Link>
                  {cycle.status === "draft" && (
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full text-left text-green-600"
                      onClick={onActivate}
                    >
                      <Play className="h-4 w-4" />
                      Activate
                    </button>
                  )}
                  {cycle.status === "active" && (
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full text-left text-blue-600"
                      onClick={onComplete}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark Complete
                    </button>
                  )}
                  {cycle.status !== "archived" && (
                    <>
                      <div className="border-t my-1" />
                      <button
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full text-left text-muted-foreground"
                        onClick={onArchive}
                      >
                        <Archive className="h-4 w-4" />
                        Archive
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Progress */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : progress ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{progress.totalEmployees}</div>
                    <div className="text-sm text-muted-foreground">Employees</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{progress.totalCompetencies}</div>
                    <div className="text-sm text-muted-foreground">Total Skills</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {progress.verifiedCompetencies}
                    </div>
                    <div className="text-sm text-muted-foreground">Verified</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {progress.completionRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">Complete</div>
                  </div>
                </div>

                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progress.completionRate}%` }}
                  />
                </div>

                <Link href={`/admin/agency/cycles/${cycle.id}`}>
                  <Button variant="outline" className="w-full">
                    View Full Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-muted-foreground text-center">No competencies tracked yet</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateCycleModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [cycleType, setCycleType] = React.useState<"initial" | "annual" | "remedial">("annual");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [description, setDescription] = React.useState("");

  const createCycle = useCreateVerificationCycle();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;

    await createCycle.mutateAsync({
      name,
      cycle_type: cycleType,
      start_date: startDate,
      end_date: endDate,
      description,
    });
    onClose();
  };

  // Auto-generate name when type changes
  React.useEffect(() => {
    const year = new Date().getFullYear();
    if (cycleType === "annual") {
      setName(`Annual Verification ${year}`);
    } else if (cycleType === "initial") {
      setName(`Initial Verification ${year}`);
    } else {
      setName(`Remedial Training ${year}`);
    }
  }, [cycleType]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Create Verification Cycle</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Cycle Type *</label>
              <Select
                value={cycleType}
                options={CYCLE_TYPES}
                onChange={(value) => setCycleType(value as "initial" | "annual" | "remedial")}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Cycle Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Annual Verification 2025"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date *</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date *</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCycle.isPending || !name || !startDate || !endDate}
              >
                {createCycle.isPending ? "Creating..." : "Create Cycle"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
