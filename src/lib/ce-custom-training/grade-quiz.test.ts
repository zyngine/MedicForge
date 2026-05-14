import { describe, it, expect } from 'vitest';
import { gradeQuiz, type QuizQuestion } from './grade-quiz';

const questions: QuizQuestion[] = [
  { id: 'q1', question: '2+2?', options: ['3', '4', '5'], correct_index: 1 },
  { id: 'q2', question: 'Capital of FR?', options: ['Berlin', 'Paris', 'Rome'], correct_index: 1 },
];

describe('gradeQuiz', () => {
  it('returns 100 when all correct', () => {
    expect(gradeQuiz(questions, [1, 1])).toEqual({ score: 100, correct: 2, total: 2 });
  });
  it('returns 50 with one right', () => {
    expect(gradeQuiz(questions, [1, 0])).toEqual({ score: 50, correct: 1, total: 2 });
  });
  it('returns 0 when all wrong', () => {
    expect(gradeQuiz(questions, [0, 0])).toEqual({ score: 0, correct: 0, total: 2 });
  });
  it('treats missing answers as wrong', () => {
    expect(gradeQuiz(questions, [1])).toEqual({ score: 50, correct: 1, total: 2 });
  });
  it('handles empty quiz as 100', () => {
    expect(gradeQuiz([], [])).toEqual({ score: 100, correct: 0, total: 0 });
  });
});
