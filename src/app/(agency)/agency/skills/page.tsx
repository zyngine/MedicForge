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
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";
import { useAgencySkills } from "@/lib/hooks/use-agency-data";
import type { AgencySkill } from "@/lib/hooks/use-agency-data";

function SkillCard({ skill }: { skill: AgencySkill }) {
  return (
    <Link href={`/agency/skills/${skill.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{skill.name}</h3>
            {skill.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {skill.description}
              </p>
            )}
            <div className="flex flex-wrap gap-1 mt-3">
              {skill.certification_levels.map((level) => (
                <Badge key={level} variant="secondary" className="text-xs">
                  {level}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
            <span>{skill.category}</span>
            {skill.requires_annual_verification && (
              <span className="text-warning text-xs">Annual verification</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function SkillsPage() {
  const { isAgencyAdmin } = useAgencyRole();
  const { skills, isLoading } = useAgencySkills();
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredSkills = React.useMemo(() => {
    if (!searchQuery) return skills;
    const query = searchQuery.toLowerCase();
    return skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        (skill.description?.toLowerCase().includes(query) ?? false)
    );
  }, [skills, searchQuery]);

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
          <Button asChild>
            <Link href="/agency/skills/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Skill
            </Link>
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
