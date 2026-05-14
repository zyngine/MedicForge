import { describe, it, expect } from 'vitest';
import { canUseCustomTraining, CUSTOM_TRAINING_TIERS } from './ce-tiers';

describe('canUseCustomTraining', () => {
  it('returns true for enterprise tier', () => {
    expect(canUseCustomTraining('enterprise')).toBe(true);
  });
  it('returns true for enterprise_plus tier', () => {
    expect(canUseCustomTraining('enterprise_plus')).toBe(true);
  });
  it('returns true for custom tier', () => {
    expect(canUseCustomTraining('custom')).toBe(true);
  });
  it('returns false for starter', () => {
    expect(canUseCustomTraining('starter')).toBe(false);
  });
  it('returns false for team', () => {
    expect(canUseCustomTraining('team')).toBe(false);
  });
  it('returns false for agency', () => {
    expect(canUseCustomTraining('agency')).toBe(false);
  });
  it('returns false for null', () => {
    expect(canUseCustomTraining(null)).toBe(false);
  });
  it('returns false for undefined', () => {
    expect(canUseCustomTraining(undefined)).toBe(false);
  });
  it('exports the tier list', () => {
    expect(CUSTOM_TRAINING_TIERS).toEqual(['enterprise', 'enterprise_plus', 'custom']);
  });
});
