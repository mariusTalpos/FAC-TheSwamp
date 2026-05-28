import type { ReactNode } from "react";

export type EntityListProps<T> = {
  items: T[];
  renderRow: (item: T) => ReactNode;
  keyExtractor?: (item: T) => string;
  empty: ReactNode;
  loading?: boolean;
  "aria-label"?: string;
};

export function EntityList<T>({
  items,
  renderRow,
  keyExtractor,
  empty,
  loading,
  "aria-label": ariaLabel,
}: EntityListProps<T>) {
  if (loading) {
    return <p role="status">Loading…</p>;
  }
  if (items.length === 0) {
    return <>{empty}</>;
  }
  return (
    <ul aria-label={ariaLabel}>
      {items.map((item, index) => (
        <li key={keyExtractor?.(item) ?? String(index)}>{renderRow(item)}</li>
      ))}
    </ul>
  );
}
