"use client";

import { ExamPlayer } from "@/components/exams/exam-player";

interface Props {
  params: { attemptId: string };
}

export default function TakeExamPage({ params }: Props) {
  return (
    <div className="container max-w-4xl py-8">
      <ExamPlayer
        templateId=""
        existingAttemptId={params.attemptId}
      />
    </div>
  );
}
