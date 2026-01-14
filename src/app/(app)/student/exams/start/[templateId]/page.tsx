"use client";

import { ExamPlayer } from "@/components/exams/exam-player";

interface Props {
  params: { templateId: string };
}

export default function StartExamPage({ params }: Props) {
  return (
    <div className="container max-w-4xl py-8">
      <ExamPlayer templateId={params.templateId} />
    </div>
  );
}
