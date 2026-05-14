export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
}

export interface QuizResult {
  score: number;
  correct: number;
  total: number;
}

export function gradeQuiz(questions: QuizQuestion[], answers: number[]): QuizResult {
  const total = questions.length;
  if (total === 0) return { score: 100, correct: 0, total: 0 };
  const correct = questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.correct_index ? 1 : 0),
    0,
  );
  return { score: Math.round((correct / total) * 100), correct, total };
}
