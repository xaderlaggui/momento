import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { loadGuestSession, resumeMember, countKept } from "@/lib/guest";
import { SHOTS_PER_ROLL } from "@/lib/supabase";
import { Button, Flick } from "@/components/ui";

export default function Done() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [kept, setKept] = useState<number | null>(null);
  const session = loadGuestSession(code);

  useEffect(() => {
    if (!session) return;
    resumeMember(code)
      .then((m) => countKept(m.id))
      .then(setKept)
      .catch(() => setKept(null));
  }, [code, session]);

  if (!session) return <Navigate to={`/r/${code}`} replace />;

  return (
    <main className="screen done-screen">
      <div className="finished-stamp">
        ROLL
        <br />
        FINISHED
      </div>
      <h1>You used all {SHOTS_PER_ROLL}.</h1>
      <p>
        {kept !== null
          ? `You kept ${kept} shots. Every keep is safe with the host.`
          : "Your keeps are safe with the host."}
      </p>
      <Flick pose="cheese" size="large" />
      <div className="lower-actions">
        <Button variant="secondary" onClick={() => navigate("/")}>
          Join another camera
        </Button>
      </div>
    </main>
  );
}
