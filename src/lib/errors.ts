// Formats Supabase/flat errors for display. Keeps code + hint so failures are diagnosable.

export function describe(e: unknown): string {
  const err = e as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
    error_description?: string;
  };
  const parts = [
    err?.message,
    err?.error_description,
    err?.code ? `code:${err.code}` : null,
    err?.details,
    err?.hint,
  ].filter(Boolean);
  return parts.join(" · ") || "Upload failed";
}
