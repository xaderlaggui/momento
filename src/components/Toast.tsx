import { useEffect } from "react";

/** Transient, non-blocking status pop. Auto-dismisses. */
export default function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 2800);
    return () => window.clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__dot" />
      <span>{message}</span>
    </div>
  );
}
