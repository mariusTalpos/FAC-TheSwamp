export type SuccessMessageProps = { message: string };

export function SuccessMessage({ message }: SuccessMessageProps) {
  return (
    <p role="status" aria-live="polite">
      {message}
    </p>
  );
}
