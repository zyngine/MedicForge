"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Spinner,
  Textarea,
  Label,
  Modal,
} from "@/components/ui";
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Send,
} from "lucide-react";
import { useMyPeerReviews } from "@/lib/hooks/use-peer-review";
import { formatRelativeTime } from "@/lib/utils";

export default function StudentPeerReviewsPage() {
  const {
    assignedReviews,
    receivedReviews,
    pendingReviews,
    inProgressReviews,
    completedReviews,
    isLoading,
    startReview,
    submitReview,
    rateReviewHelpfulness,
  } = useMyPeerReviews();

  const [selectedReview, setSelectedReview] = React.useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [feedbackModal, setFeedbackModal] = React.useState<{
    reviewId: string;
    isHelpful: boolean | null;
  } | null>(null);
  const [helpfulnessFeedback, setHelpfulnessFeedback] = React.useState("");

  const handleStartReview = async (pairId: string) => {
    await startReview(pairId);
    setSelectedReview(pairId);
  };

  const handleSubmitReview = async (pairId: string) => {
    if (!reviewFeedback.trim()) return;

    setIsSubmitting(true);
    try {
      await submitReview(pairId, {
        overall_feedback: reviewFeedback,
      });
      setSelectedReview(null);
      setReviewFeedback("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRateHelpfulness = async () => {
    if (!feedbackModal) return;

    await rateReviewHelpfulness(
      feedbackModal.reviewId,
      feedbackModal.isHelpful || false,
      helpfulnessFeedback
    );
    setFeedbackModal(null);
    setHelpfulnessFeedback("");
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
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Peer Reviews
        </h1>
        <p className="text-muted-foreground">
          Review your peers' work and receive feedback on yours
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-3xl font-bold mt-1">{pendingReviews.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-warning/10 text-warning">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold mt-1">{completedReviews.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 text-success">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Received</p>
                <p className="text-3xl font-bold mt-1">{receivedReviews.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-info/10 text-info">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="to-review">
        <TabsList>
          <TabsTrigger value="to-review">
            To Review ({pendingReviews.length + inProgressReviews.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedReviews.length})
          </TabsTrigger>
          <TabsTrigger value="received">
            Received ({receivedReviews.length})
          </TabsTrigger>
        </TabsList>

        {/* To Review Tab */}
        <TabsContent value="to-review">
          <Card>
            <CardContent className="p-0">
              {pendingReviews.length === 0 && inProgressReviews.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                  <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">
                    No peer reviews pending
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {[...inProgressReviews, ...pendingReviews].map((review) => (
                    <div key={review.id} className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Peer Submission</p>
                            <p className="text-sm text-muted-foreground">
                              Assigned {formatRelativeTime(review.assigned_at)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={review.status === "in_progress" ? "info" : "warning"}
                        >
                          {review.status === "in_progress" ? "In Progress" : "Pending"}
                        </Badge>
                      </div>

                      {selectedReview === review.id ? (
                        <div className="space-y-4 border-t pt-4">
                          {/* Submission Content Preview */}
                          <div className="p-4 bg-muted rounded-lg">
                            <h4 className="font-medium mb-2">Submission Content</h4>
                            <p className="text-sm text-muted-foreground">
                              {typeof review.submission?.content === "string"
                                ? review.submission.content.slice(0, 500)
                                : "View the full submission to review"}
                              {typeof review.submission?.content === "string" &&
                                review.submission.content.length > 500 &&
                                "..."}
                            </p>
                          </div>

                          {/* Review Form */}
                          <div className="space-y-2">
                            <Label>Your Feedback</Label>
                            <Textarea
                              placeholder="Provide constructive feedback for your peer..."
                              value={reviewFeedback}
                              onChange={(e) => setReviewFeedback(e.target.value)}
                              rows={5}
                            />
                            <p className="text-xs text-muted-foreground">
                              Be specific and constructive. Focus on strengths and areas
                              for improvement.
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleSubmitReview(review.id)}
                              disabled={!reviewFeedback.trim() || isSubmitting}
                              isLoading={isSubmitting}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Submit Review
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedReview(null);
                                setReviewFeedback("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleStartReview(review.id)}
                          className="w-full"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {review.status === "in_progress"
                            ? "Continue Review"
                            : "Start Review"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed">
          <Card>
            <CardContent className="p-0">
              {completedReviews.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No completed reviews</h3>
                  <p className="text-muted-foreground">
                    Reviews you complete will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {completedReviews.map((review) => (
                    <div key={review.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-success/10">
                            <CheckCircle className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <p className="font-medium">Review Completed</p>
                            <p className="text-sm text-muted-foreground">
                              Submitted {review.completed_at && formatRelativeTime(review.completed_at)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="success">Completed</Badge>
                      </div>
                      {review.review && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <p className="text-sm">
                            {review.review.overall_feedback?.slice(0, 200)}
                            {review.review.overall_feedback &&
                              review.review.overall_feedback.length > 200 &&
                              "..."}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Received Tab */}
        <TabsContent value="received">
          <Card>
            <CardContent className="p-0">
              {receivedReviews.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No reviews received</h3>
                  <p className="text-muted-foreground">
                    Feedback from peers will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {receivedReviews.map((review) => (
                    <div key={review.id} className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-info/10">
                            <MessageSquare className="h-5 w-5 text-info" />
                          </div>
                          <div>
                            <p className="font-medium">Peer Feedback</p>
                            <p className="text-sm text-muted-foreground">
                              Received {review.completed_at && formatRelativeTime(review.completed_at)}
                            </p>
                          </div>
                        </div>
                        {review.review?.overall_score && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-warning fill-warning" />
                            <span className="font-medium">
                              {review.review.overall_score}/5
                            </span>
                          </div>
                        )}
                      </div>

                      {review.review && (
                        <div className="space-y-4">
                          <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm">{review.review.overall_feedback}</p>
                          </div>

                          {review.review.strengths && (
                            <div>
                              <p className="text-sm font-medium text-success mb-1">
                                Strengths
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {review.review.strengths}
                              </p>
                            </div>
                          )}

                          {review.review.areas_for_improvement && (
                            <div>
                              <p className="text-sm font-medium text-warning mb-1">
                                Areas for Improvement
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {review.review.areas_for_improvement}
                              </p>
                            </div>
                          )}

                          {/* Helpfulness rating */}
                          {review.review.is_helpful === null && (
                            <div className="pt-4 border-t">
                              <p className="text-sm text-muted-foreground mb-2">
                                Was this feedback helpful?
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setFeedbackModal({
                                      reviewId: review.review!.id,
                                      isHelpful: true,
                                    })
                                  }
                                >
                                  <ThumbsUp className="h-4 w-4 mr-1" />
                                  Yes
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setFeedbackModal({
                                      reviewId: review.review!.id,
                                      isHelpful: false,
                                    })
                                  }
                                >
                                  <ThumbsDown className="h-4 w-4 mr-1" />
                                  No
                                </Button>
                              </div>
                            </div>
                          )}

                          {review.review.is_helpful !== null && (
                            <div className="pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                              {review.review.is_helpful ? (
                                <>
                                  <ThumbsUp className="h-4 w-4 text-success" />
                                  You marked this as helpful
                                </>
                              ) : (
                                <>
                                  <ThumbsDown className="h-4 w-4 text-warning" />
                                  You marked this as not helpful
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Helpfulness Modal */}
      <Modal
        isOpen={feedbackModal !== null}
        onClose={() => setFeedbackModal(null)}
        title="Rate This Feedback"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {feedbackModal?.isHelpful
              ? "Great! Would you like to add a comment about what was helpful?"
              : "We're sorry this feedback wasn't helpful. What could have been better?"}
          </p>
          <Textarea
            placeholder="Optional: Add a comment..."
            value={helpfulnessFeedback}
            onChange={(e) => setHelpfulnessFeedback(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFeedbackModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleRateHelpfulness}>Submit</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
