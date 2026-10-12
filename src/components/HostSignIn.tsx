import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Flick, TextField } from "@/components/ui";

type Mode = "signin" | "signup";
type EmailPath = "magic" | "password";

/**
 * Host-only sign-in and registration (Google, magic link, or email + password).
 *
 * Guests never sign in — they enter a room code. Collaborators are simply
 * guests holding a code, so there is no account concept for them.
 *
 * Rendered inside the landing page or the standalone `/auth` door. `onExit` is
 * optional: supply it when the component is shown as a swappable panel.
 */
export default function HostSignIn({ onExit }: { onExit?: () => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [path, setPath] = useState<EmailPath>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const callback = () => `${window.location.origin}/auth/callback`;
  const validEmail = email.includes("@");

  function reset() {
    setSent(false);
    setNotice(null);
    setError(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setPath("magic");
    reset();
  }

  async function sendLink() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback() },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function passwordSignIn() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    else window.location.assign("/dashboard");
  }

  async function signUp() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callback() },
    });
    setBusy(false);
    if (error) setError(error.message);
    else if (data.session) window.location.assign("/dashboard");
    else setNotice(`Almost there. We sent a confirmation link to ${email}.`);
  }

  async function resetPassword() {
    if (!validEmail) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setBusy(false);
    if (error) setError(error.message);
    else setNotice(`Password reset link sent to ${email}.`);
  }

  async function googleSignIn() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback() },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="landing-auth" data-testid="host-sign-in">
        <div className="landing-auth__art">
          <Flick pose="hype" size="medium" />
        </div>
        <div className="code-copy">
          <p className="eyebrow">HOST ACCESS</p>
          <h1>Check your email</h1>
          <p>{`We sent a magic link to ${email}. It is good for 15 minutes.`}</p>
        </div>
        <div className="lower-actions">
          <Button onClick={sendLink} disabled={busy}>
            {busy ? "Sending…" : "Resend link"}
          </Button>
          <button className="text-link" onClick={reset}>
            Use another email
          </button>
        </div>
      </div>
    );
  }

  const signupPath = mode === "signup";

  return (
    <div className="landing-auth" data-testid="host-sign-in">
      <div className="landing-auth__art">
        <Flick pose="idle" size="medium" />
      </div>
      <div className="code-copy">
        <p className="eyebrow">HOST ACCESS</p>
        <h1>{signupPath ? "Create your host account" : "Sign in to host"}</h1>
        <p>
          {signupPath
            ? "One account for every room you run."
            : "No password needed. Use Google or a one-tap magic link."}
        </p>
      </div>

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
        onChange={(v) => {
          setEmail(v);
          setError(null);
        }}
      />

      {signupPath || path === "password" ? (
        <TextField
          label="Password"
          placeholder="At least 6 characters"
          type="password"
          autoComplete={signupPath ? "new-password" : "current-password"}
          value={password}
          onChange={setPassword}
        />
      ) : null}

      {(error || notice) && (
        <p style={{ color: error ? "var(--destructive)" : "var(--ink)", fontSize: 13 }} role={error ? "alert" : undefined}>
          {error ?? notice}
        </p>
      )}

      {signupPath ? (
        <>
          <Button onClick={signUp} disabled={busy || !validEmail || password.length < 6}>
            {busy ? "Creating…" : "Create account"}
          </Button>
          <div className="lower-actions">
            <button className="text-link" onClick={() => switchMode("signin")}>
              Already have an account? Sign in
            </button>
          </div>
        </>
      ) : path === "password" ? (
        <>
          <Button onClick={passwordSignIn} disabled={busy || !validEmail || password.length < 6}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <div className="lower-actions">
            <button className="text-link" onClick={() => setPath("magic")}>
              Use a magic link instead
            </button>
            <button className="text-link" onClick={resetPassword} disabled={!validEmail || busy}>
              Forgot password?
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="lower-actions">
            <Button onClick={sendLink} disabled={busy || !validEmail}>
              {busy ? "Sending…" : "Send magic link"}
            </Button>
            {onExit && (
              <button className="text-link" onClick={onExit}>
                Back to code
              </button>
            )}
          </div>
          <div className="landing-auth-actions">
            <button className="text-link" onClick={() => setPath("password")}>
              Use a password instead
            </button>
            <button className="text-link" onClick={() => switchMode("signup")}>
              Create an account
            </button>
          </div>
        </>
      )}
    </div>
  );
}
