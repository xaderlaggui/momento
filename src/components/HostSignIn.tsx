import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Flick, TextField } from "@/components/ui";

/**
 * Host-only sign-in (Google or email magic link).
 *
 * Guests never sign in — they enter a room code. Collaborators are simply
 * guests holding a code, so there is no account concept for them.
 *
 * Rendered inside the landing page or any other host door. `onExit` is
 * optional: supply it when the component is shown as a swappable panel.
 */
export default function HostSignIn({ onExit }: { onExit?: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendLink() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function googleSignIn() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="landing-auth" data-testid="host-sign-in">
      <div className="landing-auth__art">
        <Flick pose={sent ? "hype" : "idle"} size="medium" />
      </div>
      <div className="code-copy">
        <p className="eyebrow">HOST ACCESS</p>
        <h1>{sent ? "Check your email" : "Sign in to host"}</h1>
        <p>
          {sent
            ? `We sent a magic link to ${email}. It is good for 15 minutes.`
            : "No password. Use Google or a one-tap magic link."}
        </p>
      </div>

      {sent ? (
        <div className="lower-actions">
          <Button onClick={sendLink} disabled={busy}>
            {busy ? "Sending…" : "Resend link"}
          </Button>
          <button className="text-link" onClick={() => setSent(false)}>
            Use another email
          </button>
        </div>
      ) : (
        <>
          <div>
            <Button variant="secondary" onClick={googleSignIn} disabled={busy}>
              Continue with Google
            </Button>
          </div>
          <p className="eyebrow landing-divider-label">OR USE EMAIL</p>
          <TextField
            label="Email"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={setEmail}
          />
          {error && (
            <p style={{ color: "var(--destructive)", fontSize: 13 }}>{error}</p>
          )}
          <div className="lower-actions">
            <Button onClick={sendLink} disabled={busy || !email.includes("@")}>
              {busy ? "Sending…" : "Send magic link"}
            </Button>
            {onExit && (
              <button className="text-link" onClick={onExit}>
                Back to code
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
