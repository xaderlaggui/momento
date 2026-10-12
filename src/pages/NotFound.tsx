import { useNavigate } from "react-router-dom";
import { Button, Flick } from "@/components/ui";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="screen done-screen">
      <Flick pose="deflated" size="large" />
      <p className="eyebrow">OUT OF FRAME</p>
      <h1>This camera does not exist</h1>
      <p>That link may be mistyped. Ask the host for a fresh one.</p>
      <div className="lower-actions">
        <Button onClick={() => navigate("/")}>Enter a code</Button>
        <Button variant="secondary" onClick={() => navigate("/auth")}>
          Host sign-in
        </Button>
      </div>
    </main>
  );
}
