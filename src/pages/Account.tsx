import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { BackBar, Button, Flick, Icon, Sheet } from "@/components/ui";

export default function Account({
  dark,
  onToggleDark,
}: {
  dark: boolean;
  onToggleDark: () => void;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      const meta = (data.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
      setName(meta.full_name ?? meta.name ?? "");
    });
  }, []);

  async function onSignOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  async function onDelete() {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen standard-screen">
      <BackBar label="Cameras" onBack={() => navigate("/dashboard")} />
      <header className="screen-title">
        <div>
          <p className="eyebrow">MOMENTO HOST</p>
          <h1>Account</h1>
        </div>
      </header>

      <section className="inset-list">
        <div className="progress-row account-row">
          <span className="room-row__icon">
            <Icon name="user" />
          </span>
          <span className="room-row__copy">
            <strong>{name || "Host"}</strong>
            <small>{email ?? "—"}</small>
          </span>
        </div>
        <button className="progress-row account-row account-row--action" onClick={onToggleDark}>
          <span className="room-row__copy">
            <strong>Appearance</strong>
            <small>{dark ? "Dark" : "Light"} theme</small>
          </span>
          <Icon name={dark ? "sun" : "moon"} />
        </button>
      </section>

      <div className="room-actions">
        <Button variant="secondary" onClick={onSignOut}>
          Sign out
        </Button>
        <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
          Delete account
        </Button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {confirmDelete && (
        <Sheet title="Delete account" onDismiss={() => setConfirmDelete(false)}>
          <div className="sheet__mascot">
            <Flick pose="deflated" size="small" />
          </div>
          <div className="sheet__heading">
            <p className="eyebrow">POINT OF NO RETURN</p>
            <h2>Delete your account?</h2>
            <p>
              This permanently removes your account and every room and photo you own. It cannot be
              undone. Type DELETE to confirm.
            </p>
          </div>
          <input
            className="code-input code-input--sm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm"
          />
          <Button variant="destructive" onClick={onDelete} disabled={busy || confirmText !== "DELETE"}>
            {busy ? "Deleting…" : "Delete everything"}
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Keep my account
          </Button>
        </Sheet>
      )}
    </main>
  );
}
