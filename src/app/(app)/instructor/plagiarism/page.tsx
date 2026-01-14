"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Input,
  Label,
  Spinner,
  Modal,
  Textarea,
  Progress,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
} from "@/components/ui";
import {
  Search,
  FileSearch,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  FileText,
  Database,
  Upload,
} from "lucide-react";
import {
  usePlagiarismChecks,
  usePlagiarismSources,
  useRunPlagiarismCheck,
  useAddPlagiarismSource,
  useRemovePlagiarismSource,
  type PlagiarismCheck,
  type PlagiarismSource,
} from "@/lib/hooks/use-plagiarism";
import { useSubmissions } from "@/lib/hooks/use-submissions";
import { useAssignments } from "@/lib/hooks/use-assignments";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default function InstructorPlagiarismPage() {
  const { data: checks = [], isLoading: checksLoading, refetch: refetchChecks } = usePlagiarismChecks();
  const { data: sources = [], isLoading: sourcesLoading } = usePlagiarismSources();
  const { data: submissions = [] } = useSubmissions({ status: "submitted" });
  const { data: assignments = [] } = useAssignments({ includeUnpublished: false });
  const runCheck = useRunPlagiarismCheck();
  const addSource = useAddPlagiarismSource();
  const removeSource = useRemovePlagiarismSource();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedCheck, setSelectedCheck] = React.useState<PlagiarismCheck | null>(null);
  const [addSourceModal, setAddSourceModal] = React.useState(false);
  const [sourceForm, setSourceForm] = React.useState({
    title: "",
    content: "",
    sourceType: "document",
  });
  const [runCheckModal, setRunCheckModal] = React.useState(false);
  const [selectedSubmission, setSelectedSubmission] = React.useState<string>("");

  // Filter checks
  const filteredChecks = React.useMemo(() => {
    let result = checks;

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (searchTerm) {
      result = result.filter(
        (c) =>
          c.submission?.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.submission?.assignment?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [checks, statusFilter, searchTerm]);

  // Unchecked submissions
  const uncheckedSubmissions = React.useMemo(() => {
    const checkedIds = new Set(checks.map((c) => c.submission_id));
    return submissions.filter((s) => !checkedIds.has(s.id));
  }, [submissions, checks]);

  const handleRunCheck = async () => {
    if (!selectedSubmission) return;

    const submission = submissions.find((s) => s.id === selectedSubmission);
    if (!submission) return;

    // Extract text content from submission
    const submissionContent = submission.content as Record<string, unknown> | string | null;
    const content =
      typeof submissionContent === "string"
        ? submissionContent
        : typeof submissionContent === "object" && submissionContent !== null && "text" in submissionContent
        ? String(submissionContent.text)
        : JSON.stringify(submissionContent);

    await runCheck.mutateAsync({
      submissionId: submission.id,
      content,
    });

    setRunCheckModal(false);
    setSelectedSubmission("");
  };

  const handleAddSource = async () => {
    if (!sourceForm.title.trim() || !sourceForm.content.trim()) return;

    await addSource.mutateAsync({
      title: sourceForm.title,
      content: sourceForm.content,
      sourceType: sourceForm.sourceType,
    });

    setAddSourceModal(false);
    setSourceForm({ title: "", content: "", sourceType: "document" });
  };

  const handleRemoveSource = async (sourceId: string) => {
    await removeSource.mutateAsync(sourceId);
  };

  const getSimilarityBadge = (score: number | null) => {
    if (score === null) return <Badge variant="secondary">Pending</Badge>;
    if (score >= 50) return <Badge variant="destructive">{score}% Match</Badge>;
    if (score >= 25) return <Badge variant="warning">{score}% Match</Badge>;
    if (score >= 10) return <Badge variant="info">{score}% Match</Badge>;
    return <Badge variant="success">{score}% Match</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "processing":
        return <RefreshCw className="h-4 w-4 text-info animate-spin" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Stats
  const completedChecks = checks.filter((c) => c.status === "completed");
  const highSimilarity = completedChecks.filter((c) => (c.similarity_score || 0) >= 50);
  const avgSimilarity = completedChecks.length > 0
    ? Math.round(
        completedChecks.reduce((sum, c) => sum + (c.similarity_score || 0), 0) /
          completedChecks.length
      )
    : 0;

  const isLoading = checksLoading || sourcesLoading;

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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSearch className="h-6 w-6" />
            Plagiarism Detection
          </h1>
          <p className="text-muted-foreground">
            Check student submissions for originality
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetchChecks()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setRunCheckModal(true)}>
            <FileSearch className="h-4 w-4 mr-2" />
            Run Check
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileSearch className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{checks.length}</p>
                <p className="text-sm text-muted-foreground">Total Checks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedChecks.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{highSimilarity.length}</p>
                <p className="text-sm text-muted-foreground">High Similarity (50%+)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Database className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sources.length}</p>
                <p className="text-sm text-muted-foreground">Source Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checks">
        <TabsList>
          <TabsTrigger value="checks">Plagiarism Checks ({checks.length})</TabsTrigger>
          <TabsTrigger value="sources">Source Library ({sources.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="checks" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student or assignment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "completed", label: "Completed" },
                { value: "processing", label: "Processing" },
                { value: "pending", label: "Pending" },
                { value: "failed", label: "Failed" },
              ]}
              className="w-[180px]"
            />
          </div>

          {/* Unchecked Submissions Alert */}
          {uncheckedSubmissions.length > 0 && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <div>
                      <p className="font-medium">
                        {uncheckedSubmissions.length} submissions not yet checked
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Run plagiarism checks to ensure originality
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setRunCheckModal(true)}>
                    Run Check
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checks List */}
          {filteredChecks.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No plagiarism checks</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all"
                    ? "No checks match your filters"
                    : "Run your first plagiarism check on a submission"}
                </p>
                <Button onClick={() => setRunCheckModal(true)}>
                  <FileSearch className="h-4 w-4 mr-2" />
                  Run Check
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredChecks.map((check) => (
                <Card key={check.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getStatusIcon(check.status)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {check.submission?.student?.full_name || "Unknown Student"}
                            </span>
                            {check.status === "completed" &&
                              getSimilarityBadge(check.similarity_score)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {check.submission?.assignment?.title || "Assignment"}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Checked {formatRelativeTime(check.created_at)}</span>
                            {check.word_count && <span>{check.word_count} words</span>}
                            {check.matches && check.matches.length > 0 && (
                              <span>{check.matches.length} matches found</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {check.status === "completed" && check.similarity_score !== null && (
                          <div className="text-right mr-4">
                            <p className="text-2xl font-bold">{check.similarity_score}%</p>
                            <p className="text-xs text-muted-foreground">similarity</p>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCheck(check)}
                          disabled={check.status !== "completed"}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>

                    {check.status === "completed" && check.similarity_score !== null && (
                      <div className="mt-4">
                        <Progress
                          value={check.similarity_score}
                          className={`h-2 ${
                            check.similarity_score >= 50
                              ? "[&>div]:bg-destructive"
                              : check.similarity_score >= 25
                              ? "[&>div]:bg-warning"
                              : "[&>div]:bg-success"
                          }`}
                        />
                      </div>
                    )}

                    {check.status === "failed" && check.error_message && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                        Error: {check.error_message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setAddSourceModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Source Document
            </Button>
          </div>

          {sources.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No source documents</h3>
                <p className="text-muted-foreground mb-4">
                  Add documents to compare submissions against
                </p>
                <Button onClick={() => setAddSourceModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Source
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sources.map((source) => (
                <Card key={source.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{source.title}</span>
                      </div>
                      <Badge variant="outline">{source.source_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {source.content.slice(0, 150)}...
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{source.word_count} words</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSource(source.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Run Check Modal */}
      <Modal
        isOpen={runCheckModal}
        onClose={() => {
          setRunCheckModal(false);
          setSelectedSubmission("");
        }}
        title="Run Plagiarism Check"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Submission</Label>
            <Select
              value={selectedSubmission}
              onChange={setSelectedSubmission}
              options={submissions.map((submission) => ({
                value: submission.id,
                label: `${submission.student?.full_name} - ${submission.assignment?.title}`,
              }))}
              placeholder="Choose a submission to check..."
            />
          </div>

          <div className="p-4 bg-muted rounded-lg text-sm">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Content is compared against your source library</li>
              <li>Similarity percentage is calculated based on matching text</li>
              <li>Specific matches are highlighted for review</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setRunCheckModal(false);
                setSelectedSubmission("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRunCheck}
              disabled={!selectedSubmission || runCheck.isPending}
            >
              {runCheck.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <FileSearch className="h-4 w-4 mr-2" />
                  Run Check
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Source Modal */}
      <Modal
        isOpen={addSourceModal}
        onClose={() => {
          setAddSourceModal(false);
          setSourceForm({ title: "", content: "", sourceType: "document" });
        }}
        title="Add Source Document"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Document Title</Label>
              <Input
                value={sourceForm.title}
                onChange={(e) =>
                  setSourceForm({ ...sourceForm, title: e.target.value })
                }
                placeholder="e.g., Chapter 1 Textbook Content"
              />
            </div>
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select
                value={sourceForm.sourceType}
                onChange={(v) => setSourceForm({ ...sourceForm, sourceType: v })}
                options={[
                  { value: "document", label: "Document" },
                  { value: "textbook", label: "Textbook" },
                  { value: "article", label: "Article" },
                  { value: "website", label: "Website" },
                  { value: "previous_submission", label: "Previous Submission" },
                ]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={sourceForm.content}
              onChange={(e) =>
                setSourceForm({ ...sourceForm, content: e.target.value })
              }
              placeholder="Paste the source content here..."
              rows={10}
            />
            <p className="text-xs text-muted-foreground">
              {sourceForm.content.split(/\s+/).filter((w) => w.length > 0).length} words
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setAddSourceModal(false);
                setSourceForm({ title: "", content: "", sourceType: "document" });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSource}
              disabled={!sourceForm.title.trim() || !sourceForm.content.trim() || addSource.isPending}
            >
              {addSource.isPending ? "Adding..." : "Add Source"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Check Details Modal */}
      <Modal
        isOpen={selectedCheck !== null}
        onClose={() => setSelectedCheck(null)}
        title="Plagiarism Check Details"
        size="lg"
      >
        {selectedCheck && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">{selectedCheck.submission?.student?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedCheck.submission?.assignment?.title}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{selectedCheck.similarity_score}%</p>
                <p className="text-sm text-muted-foreground">similarity</p>
              </div>
            </div>

            {selectedCheck.matches && selectedCheck.matches.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium">Matching Sources</h4>
                {selectedCheck.matches.map((match: any, idx: number) => (
                  <Card key={idx}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium">{match.sourceTitle}</span>
                        <Badge variant="outline">{match.similarity}% match</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {match.matchedText}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                <h3 className="text-lg font-medium mb-2">No matches found</h3>
                <p className="text-muted-foreground">
                  This submission appears to be original
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setSelectedCheck(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
