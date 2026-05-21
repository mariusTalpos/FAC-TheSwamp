/**
 * Minimum required fighter profile fields until FAC publishes the definitive policy list.
 * See spec.md Dependencies — adjust when FAC supplies the authoritative field list.
 */
export const MINIMUM_PROFILE_FIELD_KEYS = ["displayName"] as const;

export type MinimumFieldKey = (typeof MINIMUM_PROFILE_FIELD_KEYS)[number];

export function isMinimumSatisfied(values: Record<string, string | null | undefined>): boolean {
  for (const key of MINIMUM_PROFILE_FIELD_KEYS) {
    const v = values[key];
    if (typeof v !== "string" || v.trim().length === 0) return false;
  }
  return true;
}

export function deriveCompletionState(
  values: Record<string, string | null | undefined>,
): "incomplete" | "complete" {
  return isMinimumSatisfied(values) ? "complete" : "incomplete";
}
