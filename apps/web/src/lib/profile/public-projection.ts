import type { VisibilityMap } from "@/lib/profile/visibility";

export type PublicFighterProfile = {
  id: string;
  displayName: string;
};

/** Anonymous-safe projection aligned with `FighterProfilePublic` (minimum public facts). */
export function toPublicFighterProfile(input: {
  id: string;
  displayName: string;
  ringName: string | null;
  visibility: VisibilityMap;
}): PublicFighterProfile {
  const displayName = input.displayName?.trim() || "Fighter";
  const ring = input.ringName?.trim();
  const showRing = Boolean(ring) && input.visibility?.ringName?.public !== false;
  if (showRing && ring) {
    return { id: input.id, displayName: `${displayName} (“${ring}”)` };
  }
  return { id: input.id, displayName };
}
