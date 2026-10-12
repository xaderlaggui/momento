import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button, Flick, TextField } from "@/components/ui";

/**
 * Password recovery landing (`/auth/reset`). `detectSessionInUrl` turns the
 * recovery `?code=` into a short-lived session, so `updateUser` can set a new
 * password without the host signing in again.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setDone(true);
      window.setTimeout(() => navigate("/dashboard", { replace: true }), 1200);
    }
  }

  return (
    <main className="screen done-screen">
      <Flick pose={done ? "cheese" : "idle"} size="medium" />
      <p className="eyebrow">HOST ACCESS</p>
      <h1>{done ? "Password updated" : "Set a new password"}</h1>
      {done ? (
        <p>Taking you to your cameras…</p>
      ) : (
        <>
          <p>Pick something at least 6 characters long.</p>
          <div className="done-form">
            <TextField
              label="New password"
              placeholder="At least 6 characters"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="lower-actions">
              <Button onClick={onSubmit} disabled={busy || password.length < 6}>
                {busy ? "Saving…" : "Update password"}
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
