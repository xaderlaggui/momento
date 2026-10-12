import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Flick } from "@/components/ui";

/**
 * Landing point for magic-link and Google redirects.
 *
 * PKCE hands back a single-use `?code=` instead of `#access_token=...`, and
 * `detectSessionInUrl` (src/lib/supabase.ts) exchanges it during client init.
 * This screen just waits for the session, scrubs the URL, and moves on.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    let settled = false;

    const finish = () => {
      if (!live || settled) return;
      settled = true;
      // Drop `?code=...` (and any legacy `#access_token=...`) from history.
      window.history.replaceState({}, "", "/dashboard");
      navigate("/dashboard", { replace: true });
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish();
    });

    const timeout = window.setTimeout(() => {
      if (live && !settled) {
        setError("That sign-in link is invalid or expired. Request a fresh one.");
      }
    }, 6000);

    return () => {
      live = false;
      sub.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <main className="screen done-screen">
      <Flick pose={error ? "deflated" : "waiting"} size="medium" />
      {error ? (
        <>
          <p className="eyebrow">SIGN-IN FAILED</p>
          <h1>Link expired</h1>
          <p>{error}</p>
          <div className="lower-actions">
            <a className="button button--primary" href="/auth">
              <span>Back to sign-in</span>
            </a>
          </div>
        </>
      ) : (
        <p className="label">Signing you in…</p>
      )}
    </main>
  );
}
