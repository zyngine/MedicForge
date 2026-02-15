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
  Input,
  Badge,
  Spinner,
} from "@/components/ui";
import {
  BookOpen,
  Plus,
  Search,
  Settings,
  ChevronRight,
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";

// Placeholder data - based on existing agency_skills table
const MOCK_SKILLS = [
  {
    id: "1",
    name: "BLS/CPR",
    description: "Basic Life Support and CPR certification",
    certLevels: ["EMR", "EMT", "AEMT", "Paramedic"],
    verificationRequired: true,
    renewalMonths: 24,
    employeeCount: 45,
  },
  {
    id: "2",
    name: "ACLS",
    description: "Advanced Cardiac Life Support",
    certLevels: ["AEMT", "Paramedic"],
    verificationRequired: true,
    renewalMonths: 24,
    employeeCount: 28,
  },
  {
    id: "3",
    name: "PALS",
    description: "Pediatric Advanced Life Support",
    certLevels: ["AEMT", "Paramedic"],
    verificationRequired: true,
    renewalMonths: 24,
    employeeCount: 28,
  },
  {
    id: "4",
    name: "12-Lead ECG Interpretation",
    description: "Ability to obtain and interpret 12-lead ECGs",
    certLevels: ["Paramedic"],
    verificationRequired: true,
    renewalMonths: 12,
    employeeCount: 18,
  },
  {
    id: "5",
    name: "IV Therapy",
    description: "Intravenous access and medication administration",
    certLevels: ["AEMT", "Paramedic"],
    verificationRequired: true,
    renewalMonths: 12,
    employeeCount: 28,
  },
  {
    id: "6",
    name: "Airway Management",
    description: "Advanced airway management including intubation",
    certLevels: ["Paramedic"],
    verificationRequired: true,
    renewalMonths: 12,
    employeeCount: 18,
  },
];

function SkillCard({ skill }: { skill: typeof MOCK_SKILLS[0] }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{skill.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {skill.description}
            </p>
            <div className="flex flex-wrap gap-1 mt-3">
              {skill.certLevels.map((level) => (
                <Badge key={level} variant="secondary" className="text-xs">
                  {level}
                </Badge>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
          <span>{skill.employeeCount} employees</span>
          <span>Renews every {skill.renewalMonths} months</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SkillsPage() {
  const { isAgencyAdmin } = useAgencyRole();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isLoading] = React.useState(false);

  const filteredSkills = React.useMemo(() => {
    if (!searchQuery) return MOCK_SKILLS;
    const query = searchQuery.toLowerCase();
    return MOCK_SKILLS.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
          <h1 className="text-2xl font-bold">Skills Library</h1>
          <p className="text-muted-foreground">
            Manage competency requirements for your agency
          </p>
        </div>
        {isAgencyAdmin && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Skill
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Skills Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSkills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No skills found</p>
            {searchQuery && (
              <p className="text-sm">Try adjusting your search</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
