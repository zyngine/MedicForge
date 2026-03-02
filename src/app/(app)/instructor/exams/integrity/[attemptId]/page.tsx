"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Textarea,
  Select,
  Spinner,
  Alert,
  Modal,
  ModalFooter,
} from "@/components/ui";
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Scissors,
  MousePointer,
  Keyboard,
  Monitor,
  Maximize,
  Printer,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  FileText,
} from "lucide-react";
import {
  useIntegritySummary,
  useIntegrityEvents,
  useReviewAttempt,
  REVIEW_DECISIONS,
  getEventTypeLabel,
  getEventSeverityColor,
  getDecisionBadgeVariant,
  getDecisionLabel,
  formatEventSummary,
  type ReviewDecision,
} from "@/lib/hooks/use-integrity-monitoring";
import { format } from "date-fns";

// Event type icons
const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  blur: EyeOff,
  focus: Eye,
  copy: Copy,
  paste: FileText,
  cut: Scissors,
  right_click: MousePointer,
  shortcut: Keyboard,
  devtools: Monitor,
  resize: Maximize,
  print: Printer,
  tab_hidden: EyeOff,
  tab_visible: Eye,
  selection: MousePointer,
  screenshot: Monitor,
};

export default function IntegrityAttemptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const { data: summary, isLoading: summaryLoading } = useIntegritySummary(attemptId);
  const { data: events = [], isLoading: eventsLoading } = useIntegrityEvents(attemptId);
  const reviewMutation = useReviewAttempt();

  const [showReviewModal, setShowReviewModal] = React.useState(false);
  const [selectedDecision, setSelectedDecision] = React.useState<ReviewDecision | "">("");
  const [reviewNotes, setReviewNotes] = React.useState("");
  const [eventFilter, setEventFilter] = React.useState<string>("all");

  const isLoading = summaryLoading || eventsLoading;

  // Filter events
  const filteredEvents = React.useMemo(() => {
    if (eventFilter === "all") return events;
    if (eventFilter === "high") return events.filter((e) => e.suspicion_level === "high");
    if (eventFilter === "medium") return events.filter((e) => e.suspicion_level === "medium" || e.suspicion_level === "high");
    return events.filter((e) => e.event_type === eventFilter);
  }, [events, eventFilter]);

  // Event type counts
  const eventCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    });
    return counts;
  }, [events]);

  const handleSubmitReview = async () => {
    if (!selectedDecision) return;

    try {
      await reviewMutation.mutateAsync({
        attemptId,
        decision: selectedDecision,
        notes: reviewNotes || undefined,
      });
      setShowReviewModal(false);
      router.push("/instructor/exams/integrity");
    } catch (error) {
      console.error("Failed to submit review:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-6">
        <Link href="/instructor/exams/integrity">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrity Review
          </Button>
        </Link>
        <Alert variant="error">
          <p>Integrity data not found for this attempt.</p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/instructor/exams/integrity">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Integrity Review
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-7 w-7" />
            Integrity Review
          </h1>
          <p className="text-muted-foreground">
            Review the integrity events for this exam attempt
          </p>
        </div>
        {!summary.reviewed && (
          <Button onClick={() => setShowReviewModal(true)}>
            Submit Review
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Summary and Events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Event Summary</CardTitle>
              <CardDescription>
                Overview of detected events during the exam
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{summary.high_suspicion_events}</p>
                  <p className="text-xs text-muted-foreground">High Suspicion</p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-center">
                  <p className="text-2xl font-bold text-yellow-600">{summary.medium_suspicion_events}</p>
                  <p className="text-xs text-muted-foreground">Medium Suspicion</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-600">{summary.low_suspicion_events}</p>
                  <p className="text-xs text-muted-foreground">Low Suspicion</p>
                </div>
              </div>

              {/* Event type breakdown */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Event Breakdown</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(eventCounts).map(([type, count]) => (
                    <Badge
                      key={type}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => setEventFilter(type)}
                    >
                      {getEventTypeLabel(type)}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Event Timeline</CardTitle>
                  <CardDescription>
                    Chronological list of all integrity events
                  </CardDescription>
                </div>
                <Select
                  value={eventFilter}
                  onChange={setEventFilter}
                  options={[
                    { value: "all", label: "All Events" },
                    { value: "high", label: "High Suspicion Only" },
                    { value: "medium", label: "Medium+ Suspicion" },
                    ...Object.keys(eventCounts).map((type) => ({
                      value: type,
                      label: getEventTypeLabel(type),
                    })),
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              {filteredEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No events match the selected filter
                </p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {filteredEvents.map((event, index) => {
                    const Icon = EVENT_ICONS[event.event_type] || AlertTriangle;
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                      >
                        <div className={`p-2 rounded-lg ${
                          event.suspicion_level === "high"
                            ? "bg-red-100 text-red-600"
                            : event.suspicion_level === "medium"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {getEventTypeLabel(event.event_type)}
                            </p>
                            <Badge
                              variant={
                                event.suspicion_level === "high"
                                  ? "destructive"
                                  : event.suspicion_level === "medium"
                                  ? "warning"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {event.suspicion_level}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.timestamp), "h:mm:ss a")}
                            {event.question_number && ` • Question ${event.question_number}`}
                          </p>
                          {Object.keys(event.event_data || {}).length > 0 && (
                            <div className="mt-1 text-xs text-muted-foreground bg-muted p-2 rounded">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(event.event_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Student info and Review status */}
        <div className="space-y-6">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{summary.student?.full_name || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{summary.student?.email || "Unknown"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Flag Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Flag Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Flagged At</p>
                <p className="font-medium">
                  {summary.flagged_at
                    ? format(new Date(summary.flagged_at), "MMM d, yyyy h:mm a")
                    : "Not flagged"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Flag Type</p>
                <Badge variant={summary.auto_flagged ? "warning" : "secondary"}>
                  {summary.auto_flagged ? "Auto-flagged" : "Manually flagged"}
                </Badge>
              </div>
              {summary.flagged_reason && (
                <div>
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p className="text-sm">{summary.flagged_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Status */}
          <Card className={summary.reviewed ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" : ""}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {summary.reviewed ? (
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
                Review Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summary.reviewed ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Decision</p>
                    <Badge variant={getDecisionBadgeVariant(summary.review_decision)}>
                      {getDecisionLabel(summary.review_decision)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reviewed By</p>
                    <p className="font-medium">{summary.reviewer?.full_name || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reviewed At</p>
                    <p className="font-medium">
                      {summary.reviewed_at
                        ? format(new Date(summary.reviewed_at), "MMM d, yyyy h:mm a")
                        : "Unknown"}
                    </p>
                  </div>
                  {summary.review_notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="text-sm">{summary.review_notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Clock className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                  <p className="font-medium">Pending Review</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    This attempt needs to be reviewed
                  </p>
                  <Button onClick={() => setShowReviewModal(true)} className="w-full">
                    Submit Review
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Submit Integrity Review"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Decision *</label>
            <Select
              value={selectedDecision}
              onChange={(v) => setSelectedDecision(v as ReviewDecision)}
              options={[
                { value: "", label: "Select a decision..." },
                ...REVIEW_DECISIONS.map((d) => ({
                  value: d.value,
                  label: `${d.label} - ${d.description}`,
                })),
              ]}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any additional notes about your decision..."
              rows={4}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Review Summary:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>{summary.total_events} total events detected</li>
              <li>{summary.high_suspicion_events} high suspicion events</li>
              <li>{formatEventSummary(summary)}</li>
            </ul>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={!selectedDecision}
              isLoading={reviewMutation.isPending}
            >
              Submit Review
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}
