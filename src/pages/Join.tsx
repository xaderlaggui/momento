import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useNavigate, useParams } from "react-router-dom";
import { joinRoom, loadGuestSession } from "@/lib/guest";
import { Button, Flick, Icon, TextField } from "@/components/ui";

export default function Join() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const session = loadGuestSession(code);
  if (session) return <Navigate to={`/r/${code}/camera`} replace />;

  async function onJoin() {
    setBusy(true);
    setError(null);
    try {
      await joinRoom(code, name);
      navigate(`/r/${code}/camera`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen join-screen">
      <div className="join-top">
        <span className="wordmark">MOMENTO</span>
        <button className="text-link" onClick={() => navigate("/login")}>
          Host
        </button>
      </div>
      <div className="join-copy">
        <span className="camera-mark">
          <Icon name="flash" />
        </span>
        <p className="eyebrow">MOMENTO CAMERA · {code.toUpperCase()}</p>
        <h1>Join the camera</h1>
        <p>Keep the moments they’ll miss.</p>
      </div>
      <div className="join-form">
        <TextField
          label="Your name"
          placeholder="Name"
          autoFocus
          value={name}
          onChange={setName}
        />
        {error && <p style={{ color: "#ff715b", fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <Button onClick={onJoin} disabled={busy || !name.trim()}>
          {busy ? "Joining…" : "Join & open camera"}
        </Button>
        <code>20 SHOTS EACH · RETAKES ARE FREE</code>
      </div>
      <div className="join-mascot">
        <Flick pose="idle" size="medium" />
      </div>
    </main>
  );
}
