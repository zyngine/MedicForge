import { describe, it, expect } from 'vitest';
import { deriveCompletedAt } from './derive-completion';

describe('deriveCompletedAt', () => {
  const t = '2026-05-14T12:00:00Z';

  it('returns null if not viewed', () => {
    expect(deriveCompletedAt({ viewed_at: null, quiz_passed_at: null, hasQuiz: false })).toBeNull();
  });
  it('returns viewed_at if no quiz exists and viewed', () => {
    expect(deriveCompletedAt({ viewed_at: t, quiz_passed_at: null, hasQuiz: false })).toBe(t);
  });
  it('returns null if quiz exists but not passed', () => {
    expect(deriveCompletedAt({ viewed_at: t, quiz_passed_at: null, hasQuiz: true })).toBeNull();
  });
  it('returns later of viewed_at and quiz_passed_at when both set', () => {
    const v = '2026-05-14T12:00:00Z';
    const q = '2026-05-14T13:00:00Z';
    expect(deriveCompletedAt({ viewed_at: v, quiz_passed_at: q, hasQuiz: true })).toBe(q);
  });
  it('handles quiz passed before view by returning later (viewed)', () => {
    const v = '2026-05-14T14:00:00Z';
    const q = '2026-05-14T13:00:00Z';
    expect(deriveCompletedAt({ viewed_at: v, quiz_passed_at: q, hasQuiz: true })).toBe(v);
  });
});
