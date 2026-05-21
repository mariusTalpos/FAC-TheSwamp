export type VisibilityMap = Record<string, { public: boolean }>;

export function mergeVisibility(
  current: VisibilityMap,
  patch?: VisibilityMap | null,
): VisibilityMap {
  if (!patch) return { ...current };
  return { ...current, ...patch };
}

export function visibilityDelta(
  before: VisibilityMap,
  after: VisibilityMap,
): Record<string, { before: { public: boolean }; after: { public: boolean } }> {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: Record<string, { before: { public: boolean }; after: { public: boolean } }> = {};
  for (const k of keys) {
    const b = before[k] ?? { public: true };
    const a = after[k] ?? { public: true };
    if (b.public !== a.public) {
      out[k] = { before: { ...b }, after: { ...a } };
    }
  }
  return out;
}
