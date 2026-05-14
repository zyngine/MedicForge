export const CUSTOM_TRAINING_TIERS = ['enterprise', 'enterprise_plus', 'custom'] as const;
export type CustomTrainingTier = typeof CUSTOM_TRAINING_TIERS[number];

export function canUseCustomTraining(tier: string | null | undefined): boolean {
  if (!tier) return false;
  return (CUSTOM_TRAINING_TIERS as readonly string[]).includes(tier);
}
