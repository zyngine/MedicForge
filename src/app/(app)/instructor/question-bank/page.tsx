"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Spinner,
  Alert,
  Modal,
} from "@/components/ui";
import {
  Plus,
  Search,
  Filter,
  Upload,
  CheckCircle,
  Clock,
  BarChart3,
  BookOpen,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import {
  useQuestionBank,
  useQuestionBankCategories,
  type QuestionBankItem,
  type QuestionBankFilters,
  type CertificationLevel,
  type QuestionDifficulty,
} from "@/lib/hooks/use-question-bank";
import { QuestionEditor } from "@/components/question-bank/question-editor";
import { QuestionImporter } from "@/components/question-bank/question-importer";

const difficultyColors: Record<QuestionDifficulty, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard: "bg-orange-100 text-orange-800",
  expert: "bg-red-100 text-red-800",
};

const certificationColors: Record<CertificationLevel, string> = {
  EMR: "bg-gray-100 text-gray-800",
  EMT: "bg-blue-100 text-blue-800",
  AEMT: "bg-purple-100 text-purple-800",
  Paramedic: "bg-indigo-100 text-indigo-800",
  All: "bg-slate-100 text-slate-800",
};

export default function QuestionBankPage() {
  const [filters, setFilters] = useState<QuestionBankFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionBankItem | null>(null);

  const { questions, total, isLoading, error, createQuestion, updateQuestion, deleteQuestion, validateQuestion, refetch } =
    useQuestionBank(filters);
  const { categories } = useQuestionBankCategories();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  };

  const handleFilterChange = (key: keyof QuestionBankFilters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const handleDelete = async (question: QuestionBankItem) => {
    if (confirm(`Delete question "${question.question_text.substring(0, 50)}..."?`)) {
      await deleteQuestion(question.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" title="Error loading question bank">
        {error.message}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground">
            {total} validated questions for assessments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImporter(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowEditor(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                className="pl-10"
                value={filters.search || ""}
                onChange={handleSearch}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {Object.keys(filters).filter((k) => k !== "search" && filters[k as keyof QuestionBankFilters]).length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {Object.keys(filters).filter((k) => k !== "search" && filters[k as keyof QuestionBankFilters]).length}
                </Badge>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={filters.categoryId || ""}
                  onChange={(e) => handleFilterChange("categoryId", e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Certification</label>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={filters.certificationLevel || ""}
                  onChange={(e) => handleFilterChange("certificationLevel", e.target.value)}
                >
                  <option value="">All Levels</option>
                  <option value="EMR">EMR</option>
                  <option value="EMT">EMT</option>
                  <option value="AEMT">AEMT</option>
                  <option value="Paramedic">Paramedic</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Difficulty</label>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={filters.difficulty || ""}
                  onChange={(e) => handleFilterChange("difficulty", e.target.value)}
                >
                  <option value="">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={filters.isValidated === undefined ? "" : filters.isValidated ? "true" : "false"}
                  onChange={(e) =>
                    handleFilterChange("isValidated", e.target.value === "" ? undefined : e.target.value)
                  }
                >
                  <option value="">All</option>
                  <option value="true">Validated</option>
                  <option value="false">Pending Review</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions List */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Questions Found</h3>
              <p className="text-muted-foreground mb-4">
                {Object.keys(filters).length > 0
                  ? "Try adjusting your filters"
                  : "Start building your question bank"}
              </p>
              <Button onClick={() => setShowEditor(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Question
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => (
            <Card key={question.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={certificationColors[question.certification_level]}>
                        {question.certification_level}
                      </Badge>
                      <Badge className={difficultyColors[question.difficulty]}>
                        {question.difficulty}
                      </Badge>
                      {question.is_validated ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Validated
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending Review</Badge>
                      )}
                      {question.category && (
                        <Badge variant="outline">{question.category.name}</Badge>
                      )}
                    </div>
                    <p className="font-medium line-clamp-2">{question.question_text}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {question.times_used} uses
                      </span>
                      {question.times_used > 0 && (
                        <span>
                          {Math.round((question.times_correct / question.times_used) * 100)}% correct
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        ~{question.time_estimate_seconds}s
                      </span>
                      <span>{question.points} pt{question.points !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedQuestion(question)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingQuestion(question);
                        setShowEditor(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!question.is_validated && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => validateQuestion(question.id)}
                        title="Validate question"
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(question)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Question Editor Modal */}
      <Modal
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingQuestion(null);
        }}
        title={editingQuestion ? "Edit Question" : "Add Question"}
        size="xl"
      >
        <QuestionEditor
          question={editingQuestion}
          categories={categories}
          onSave={async (data) => {
            if (editingQuestion) {
              await updateQuestion(editingQuestion.id, data);
            } else {
              await createQuestion(data);
            }
            setShowEditor(false);
            setEditingQuestion(null);
          }}
          onCancel={() => {
            setShowEditor(false);
            setEditingQuestion(null);
          }}
        />
      </Modal>

      {/* Question Importer Modal */}
      <Modal
        isOpen={showImporter}
        onClose={() => setShowImporter(false)}
        title="Import Questions"
        size="lg"
      >
        <QuestionImporter
          categories={categories}
          onImport={async () => {
            setShowImporter(false);
            refetch();
          }}
          onCancel={() => setShowImporter(false)}
        />
      </Modal>

      {/* Question Preview Modal */}
      <Modal
        isOpen={!!selectedQuestion}
        onClose={() => setSelectedQuestion(null)}
        title="Question Preview"
        size="lg"
      >
        {selectedQuestion && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge className={certificationColors[selectedQuestion.certification_level]}>
                {selectedQuestion.certification_level}
              </Badge>
              <Badge className={difficultyColors[selectedQuestion.difficulty]}>
                {selectedQuestion.difficulty}
              </Badge>
              {selectedQuestion.category && (
                <Badge variant="outline">{selectedQuestion.category.name}</Badge>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium text-lg">{selectedQuestion.question_text}</p>
            </div>

            {selectedQuestion.options && selectedQuestion.options.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Options:</p>
                {selectedQuestion.options.map((opt, i) => (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-lg border ${
                      opt.isCorrect ? "border-green-500 bg-green-50" : ""
                    }`}
                  >
                    <span className="font-medium mr-2">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt.text}
                    {opt.isCorrect && (
                      <CheckCircle className="inline h-4 w-4 ml-2 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedQuestion.explanation && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-1">Explanation:</p>
                <p className="text-blue-700">{selectedQuestion.explanation}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 pt-4 border-t text-sm">
              <div>
                <p className="text-muted-foreground">Times Used</p>
                <p className="font-medium">{selectedQuestion.times_used}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Success Rate</p>
                <p className="font-medium">
                  {selectedQuestion.times_used > 0
                    ? `${Math.round((selectedQuestion.times_correct / selectedQuestion.times_used) * 100)}%`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg. Time</p>
                <p className="font-medium">
                  {selectedQuestion.avg_time_seconds
                    ? `${Math.round(selectedQuestion.avg_time_seconds)}s`
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
