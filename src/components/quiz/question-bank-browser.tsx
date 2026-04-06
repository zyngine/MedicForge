"use client";

import * as React from "react";
import {
  Modal,
  Button,
  Input,
  Select,
  Badge,
  Checkbox,
  Spinner,
} from "@/components/ui";
import {
  Search,
  Database,
  CheckCircle,
  Plus,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useQuestionBank,
  useQuestionBankCategories,
  type QuestionBankItem,
  type QuestionBankFilters,
  convertToQuizQuestion,
} from "@/lib/hooks/use-question-bank";

interface QuestionBankBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelectQuestions: (questions: ReturnType<typeof convertToQuizQuestion>[]) => void;
  excludeQuestionIds?: string[];
}

const certificationLevels = [
  { value: "", label: "All Levels" },
  { value: "EMR", label: "EMR" },
  { value: "EMT", label: "EMT" },
  { value: "AEMT", label: "AEMT" },
  { value: "Paramedic", label: "Paramedic" },
];

const difficultyLevels = [
  { value: "", label: "All Difficulties" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
];

const ITEMS_PER_PAGE = 10;

export function QuestionBankBrowser({
  open,
  onClose,
  onSelectQuestions,
  excludeQuestionIds = [],
}: QuestionBankBrowserProps) {
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<QuestionBankFilters>({});
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(0);
  const [showFilters, setShowFilters] = React.useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const activeFilters: QuestionBankFilters = {
    ...filters,
    search: debouncedSearch || undefined,
  };

  const { questions, total: _total, isLoading } = useQuestionBank(activeFilters);
  const { categories } = useQuestionBankCategories();

  // Filter out already-used questions
  const availableQuestions = questions.filter(
    (q) => !excludeQuestionIds.includes(q.id)
  );

  // Pagination
  const totalPages = Math.ceil(availableQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = availableQuestions.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({
      value: c.id,
      label: c.name,
    })),
  ];

  const toggleSelection = (questionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allIds = paginatedQuestions.map((q) => q.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleImport = () => {
    const selectedQuestions = questions.filter((q) => selectedIds.has(q.id));
    const converted = selectedQuestions.map(convertToQuizQuestion);
    onSelectQuestions(converted);
    setSelectedIds(new Set());
    onClose();
  };

  const resetFilters = () => {
    setFilters({});
    setSearch("");
    setPage(0);
  };

  const hasActiveFilters =
    !!filters.categoryId ||
    !!filters.certificationLevel ||
    !!filters.difficulty ||
    !!search;

  if (!open) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Question Bank"
      size="full"
    >

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-9"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                  !
                </Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
              <Select
                options={categoryOptions}
                value={filters.categoryId || ""}
                onChange={(val) => {
                  setFilters((prev) => ({ ...prev, categoryId: val || undefined }));
                  setPage(0);
                }}
                className="w-48"
              />
              <Select
                options={certificationLevels}
                value={filters.certificationLevel || ""}
                onChange={(val) => {
                  setFilters((prev) => ({
                    ...prev,
                    certificationLevel: val as QuestionBankFilters["certificationLevel"],
                  }));
                  setPage(0);
                }}
                className="w-36"
              />
              <Select
                options={difficultyLevels}
                value={filters.difficulty || ""}
                onChange={(val) => {
                  setFilters((prev) => ({
                    ...prev,
                    difficulty: val as QuestionBankFilters["difficulty"],
                  }));
                  setPage(0);
                }}
                className="w-36"
              />
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Selection Actions */}
        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select Page
            </Button>
            {selectedIds.size > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
                <Badge variant="default">
                  {selectedIds.size} selected
                </Badge>
              </>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {paginatedQuestions.length} of {availableQuestions.length}
          </div>
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size="lg" />
            </div>
          ) : paginatedQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Database className="h-12 w-12 mb-4 opacity-50" />
              <p>No questions found</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={resetFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedQuestions.map((question) => (
                <QuestionRow
                  key={question.id}
                  question={question}
                  isSelected={selectedIds.has(question.id)}
                  onToggle={() => toggleSelection(question.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedIds.size === 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {selectedIds.size} Question{selectedIds.size !== 1 ? "s" : ""}
          </Button>
        </div>
    </Modal>
  );
}

interface QuestionRowProps {
  question: QuestionBankItem;
  isSelected: boolean;
  onToggle: () => void;
}

function QuestionRow({ question, isSelected, onToggle }: QuestionRowProps) {
  const difficultyColors = {
    easy: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    hard: "bg-orange-100 text-orange-700",
    expert: "bg-red-100 text-red-700",
  };

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox checked={isSelected} onChange={onToggle} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm line-clamp-2">{question.question_text}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {question.question_type.replace("_", " ")}
            </Badge>
            <Badge
              className={`text-xs ${difficultyColors[question.difficulty]}`}
            >
              {question.difficulty}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {question.certification_level}
            </Badge>
            {question.category && (
              <Badge variant="outline" className="text-xs">
                {question.category.name}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {question.points} pt{question.points !== 1 ? "s" : ""}
            </span>
            {question.times_used > 0 && (
              <span className="text-xs text-muted-foreground">
                Used {question.times_used}x ({Math.round((question.times_correct / question.times_used) * 100)}% correct)
              </span>
            )}
          </div>
        </div>
        {isSelected && (
          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
