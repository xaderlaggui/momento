import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { BackBar, Button, Flick, TextField } from "@/components/ui";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard", { replace: true });
    });
  }, [navigate]);

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

  return (
    <main className="screen standard-screen">
      <BackBar label="Cameras" onBack={() => navigate("/dashboard")} />
      <div className="login-art">
        <Flick pose={sent ? "hype" : "idle"} size="large" />
      </div>
      <div className="title-block">
        <p className="eyebrow">HOST ACCESS</p>
        <h1>{sent ? "Check your email" : "Sign in to host"}</h1>
        <p>
          {sent
            ? `We sent a magic link to ${email}. It is good for 15 minutes.`
            : "No password. Just a one-tap magic link."}
        </p>
      </div>
      {sent ? (
        <>
          <div className="lower-actions">
            <Button onClick={sendLink} disabled={busy}>
              {busy ? "Sending…" : "Resend link"}
            </Button>
            <Button variant="ghost" onClick={() => setSent(false)}>
              Use another email
            </Button>
          </div>
        </>
      ) : (
        <>
          <TextField
            label="Email"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={setEmail}
          />
          {error && <p style={{ color: "var(--destructive)", fontSize: 13 }}>{error}</p>}
          <div className="lower-actions">
            <Button onClick={sendLink} disabled={busy || !email.includes("@")}>
              {busy ? "Sending…" : "Send magic link"}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
