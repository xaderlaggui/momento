import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { checkRoomCode } from "@/lib/guest";
import { Button, Flick } from "@/components/ui";
import HostSignIn from "@/components/HostSignIn";

// Same alphabet the host codes are drawn from — no lookalike characters.
const NON_CODE = /[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g;

/**
 * The single door to Momento.
 *
 * Guests arrive here from a QR, a shared link, or a mistyped URL and type the
 * room code. Hosts sign in on the same screen. A signed-in host is forwarded
 * straight to their cameras.
 */
export default function Landing() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hostMode, setHostMode] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Guests hold anonymous Supabase sessions (guest.ts signInAnonymously), so a
    // bare session must not forward into the host dashboard.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !data.session.user.is_anonymous) {
        navigate("/dashboard", { replace: true });
      }
    });
  }, [navigate]);

  function onChange(value: string) {
    setCode(value.toUpperCase().replace(NON_CODE, "").slice(0, 6));
    setError(null);
  }

  /**
   * Validates the code against a real room before the guest is asked anything
   * else, so a typo never costs them a step.
   */
  async function onSubmit() {
    if (code.length < 6) {
      setError("Room codes are 6 characters. Check with the host.");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      await checkRoomCode(code);
      navigate(`/r/${code}`);
    } catch (err) {
      setError((err as Error).message);
      setChecking(false);
    }
  }

  if (hostMode) {
    return (
      <main className="screen landing-screen">
        <HostSignIn onExit={() => setHostMode(false)} />
      </main>
    );
  }

  return (
    <main className="screen landing-screen">
      <div className="landing-main">
        <div className="landing-brand">
          <Flick pose="wave" size="medium" />
          <p className="eyebrow">MOMENTO CAMERA</p>
          <h1>One camera. Everyone in the frame.</h1>
          <p>Enter the six characters from the host’s screen. No app, no sign-up.</p>
        </div>

        <div className="landing-form">
          <input
            className="code-input"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder="ABC123"
            aria-label="Room code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            maxLength={6}
            autoFocus
          />
          {error ? (
            <p className="code-error" role="alert">
              {error}
            </p>
          ) : (
            <span className="code-meta">20 SHOTS EACH · RETAKES ARE FREE</span>
          )}
        </div>
      </div>

      <div className="landing-host">
        <p className="eyebrow">HOSTING THIS ONE?</p>
        <button className="text-link" data-testid="host-door" onClick={() => setHostMode(true)}>
          Sign in to host
        </button>
      </div>

      <div className="lower-actions">
        <Button onClick={onSubmit} disabled={checking || code.length < 6}>
          {checking ? "Checking…" : "Open camera"}
        </Button>
      </div>
    </main>
  );
}
