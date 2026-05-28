export type ProblemAlertProps = {
  message: string;
  title?: string;
  onDismiss?: () => void;
};

export function ProblemAlert({ message, title, onDismiss }: ProblemAlertProps) {
  return (
    <div role="alert" aria-live="assertive">
      {title ? <strong>{title}: </strong> : null}
      <span>{message}</span>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} aria-label="Dismiss error">
          {" "}
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
