import type { VisibilityMap } from "@/lib/profile/visibility";

export type FighterProfilePrivate = {
  id: string;
  completionState: string;
  displayName: string;
  ringName: string | null;
  visibility: VisibilityMap;
};

export function toFighterProfilePrivate(fp: {
  id: string;
  completionState: string;
  displayName: string;
  ringName: string | null;
  visibility?: VisibilityMap | null;
}): FighterProfilePrivate {
  return {
    id: fp.id,
    completionState: fp.completionState,
    displayName: fp.displayName,
    ringName: fp.ringName,
    visibility: fp.visibility ?? {},
  };
}

/** Ring name must be set before it can be shown on the public fighter page. */
export function normalizeRingNameVisibility(
  ringName: string | null,
  visibility: VisibilityMap,
): VisibilityMap {
  if (!ringName?.trim()) {
    return { ...visibility, ringName: { public: false } };
  }
  return visibility;
}

export function validateRingNamePublicVisibility(
  ringName: string | null,
  visibility: VisibilityMap,
): string | null {
  if (visibility.ringName?.public === true && !ringName?.trim()) {
    return "Add a ring name before showing it on your public page.";
  }
  return null;
}
