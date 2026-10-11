import { Button, Flick } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="screen done-screen">
      <Flick pose="deflated" size="large" />
      <p className="eyebrow">OUT OF FRAME</p>
      <h1>This camera does not exist</h1>
      <p>That link may be mistyped. Ask the host for a fresh one.</p>
      <div className="lower-actions">
        <Button variant="secondary" onClick={() => window.location.assign("/")}>
          Try another code
        </Button>
      </div>
    </main>
  );
}
