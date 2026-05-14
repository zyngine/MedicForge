export interface CompletionInputs {
  viewed_at: string | null;
  quiz_passed_at: string | null;
  hasQuiz: boolean;
}

export function deriveCompletedAt(input: CompletionInputs): string | null {
  if (!input.viewed_at) return null;
  if (!input.hasQuiz) return input.viewed_at;
  if (!input.quiz_passed_at) return null;
  return input.viewed_at > input.quiz_passed_at ? input.viewed_at : input.quiz_passed_at;
}
