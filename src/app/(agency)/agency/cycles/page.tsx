"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Progress,
  Spinner,
} from "@/components/ui";
import {
  RefreshCw,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";

// Placeholder data
const MOCK_CYCLES = [
  {
    id: "1",
    name: "Annual 2025",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    status: "active",
    progress: 78,
    totalSkills: 200,
    completedSkills: 156,
    pendingVerifications: 12,
  },
  {
    id: "2",
    name: "Q1 2025 Skills Update",
    startDate: "2025-01-01",
    endDate: "2025-03-31",
    status: "active",
    progress: 65,
    totalSkills: 45,
    completedSkills: 29,
    pendingVerifications: 5,
  },
  {
    id: "3",
    name: "Annual 2024",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    status: "completed",
    progress: 100,
    totalSkills: 180,
    completedSkills: 180,
    pendingVerifications: 0,
  },
];

function CycleCard({ cycle }: { cycle: typeof MOCK_CYCLES[0] }) {
  const statusColors = {
    active: "bg-success/10 text-success border-success/30",
    completed: "bg-muted text-muted-foreground",
    draft: "bg-warning/10 text-warning border-warning/30",
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{cycle.name}</h3>
              <Badge
                variant="outline"
                className={statusColors[cycle.status as keyof typeof statusColors]}
              >
                {cycle.status.charAt(0).toUpperCase() + cycle.status.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(cycle.startDate).toLocaleDateString()} -{" "}
              {new Date(cycle.endDate).toLocaleDateString()}
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/agency/cycles/${cycle.id}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Progress</span>
              <span className="font-medium">{cycle.progress}%</span>
            </div>
            <Progress value={cycle.progress} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold">{cycle.totalSkills}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{cycle.completedSkills}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{cycle.pendingVerifications}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CyclesPage() {
  const { isAgencyAdmin } = useAgencyRole();
  const [isLoading] = React.useState(false);

  const activeCycles = MOCK_CYCLES.filter((c) => c.status === "active");
  const completedCycles = MOCK_CYCLES.filter((c) => c.status === "completed");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
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
            Manage competency verification periods
          </p>
        </div>
        {isAgencyAdmin && (
          <Button asChild>
            <Link href="/agency/cycles/new">
              <Plus className="h-4 w-4 mr-2" />
              New Cycle
            </Link>
          </Button>
        )}
      </div>

      {/* Active Cycles */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-success" />
          Active Cycles
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {activeCycles.map((cycle) => (
            <CycleCard key={cycle.id} cycle={cycle} />
          ))}
        </div>
        {activeCycles.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active cycles</p>
              {isAgencyAdmin && (
                <Button className="mt-4" asChild>
                  <Link href="/agency/cycles/new">Create Your First Cycle</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Completed Cycles */}
      {completedCycles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
            Completed Cycles
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {completedCycles.map((cycle) => (
              <CycleCard key={cycle.id} cycle={cycle} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
