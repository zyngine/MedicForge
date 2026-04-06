"use client";

import * as React from "react";
import {
  Modal,
  Button,
  Input,
  Badge,
  Spinner,
  Select,
  Card,
  CardContent,
} from "@/components/ui";
import {
  Search,
  FileText,
  Clock,
  HelpCircle,
  User,
  Tag,
  Copy,
  CheckCircle,
} from "lucide-react";
import { useQuizTemplates, useCloneQuizTemplate, type QuizTemplate } from "@/lib/hooks/use-quiz-templates";

interface QuizTemplateBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: {
    name: string;
    description: string | null;
    time_limit_minutes: number | null;
    max_attempts: number;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    show_correct_answers: boolean;
    passing_score: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questions: any[];
    total_points: number;
  }) => void;
}

const certificationLevels = [
  { value: "", label: "All Levels" },
  { value: "EMR", label: "EMR" },
  { value: "EMT", label: "EMT" },
  { value: "AEMT", label: "AEMT" },
  { value: "Paramedic", label: "Paramedic" },
];

export function QuizTemplateBrowser({
  isOpen,
  onClose,
  onSelect,
}: QuizTemplateBrowserProps) {
  const [search, setSearch] = React.useState("");
  const [certLevel, setCertLevel] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const { data: templates, isLoading } = useQuizTemplates({
    search,
    certificationLevel: certLevel || undefined,
  });

  const cloneTemplate = useCloneQuizTemplate();

  const handleSelect = async (template: QuizTemplate) => {
    setSelectedId(template.id);
    try {
      const clonedData = await cloneTemplate.mutateAsync(template.id);
      onSelect(clonedData);
      onClose();
    } catch (err) {
      console.error("Failed to clone template:", err);
    } finally {
      setSelectedId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quiz Template Library"
      description="Select a quiz template to use as a starting point for your assignment."
      size="lg"
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <Select
            value={certLevel}
            onChange={setCertLevel}
            options={certificationLevels}
            className="w-[150px]"
          />
        </div>

        {/* Template List */}
        <div className="max-h-[400px] overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : !templates || templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No quiz templates found.</p>
              <p className="text-sm mt-2">
                Save a quiz as a template to see it here.
              </p>
            </div>
          ) : (
            templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedId === template.id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => handleSelect(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{template.name}</h3>
                        {template.certification_level && (
                          <Badge variant="outline" className="text-xs">
                            {template.certification_level}
                          </Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {template.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" />
                          {template.question_count} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {template.total_points} points
                        </span>
                        {template.time_limit_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {template.time_limit_minutes} min
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Copy className="h-3 w-3" />
                          Used {template.times_used}x
                        </span>
                      </div>
                      {template.tags && template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              <Tag className="h-2 w-2 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={cloneTemplate.isPending}
                        isLoading={selectedId === template.id}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Use
                      </Button>
                    </div>
                  </div>
                  {template.creator && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      Created by {template.creator.full_name}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
