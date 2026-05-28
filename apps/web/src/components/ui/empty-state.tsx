export type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section aria-label={title}>
      <p>
        <strong>{title}</strong>
      </p>
      {description ? <p>{description}</p> : null}
    </section>
  );
}
