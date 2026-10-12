import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoomByCode } from "@/lib/api";
import type { Room } from "@/lib/types";
import { BackBar, Button, QRCodeImage } from "@/components/ui";

export default function Share() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getRoomByCode(code)
      .then(setRoom)
      .catch((e) => setError((e as Error).message));
  }, [code]);

  async function copyLink() {
    if (!room) return;
    await navigator.clipboard.writeText(`${window.location.origin}/r/${room.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function onShare() {
    if (!room) return;
    const url = `${window.location.origin}/r/${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Momento · ${room.name}`, text: "Join the camera — everyone shoots the same roll.", url });
        return;
      } catch {
        /* dismissed or unsupported → fall back to copy */
      }
    }
    await copyLink();
  }

  if (error) return <p className="page-error">{error}</p>;
  if (!room) return <p className="label p-6">Loading…</p>;

  return (
    <main className="screen standard-screen share-screen">
      <BackBar label="Cameras" onBack={() => navigate("/dashboard")} />
      <div className="share-heading">
        <p className="eyebrow">READY TO ROLL</p>
        <h1>Pass it around</h1>
        <p>Point any camera here. Nothing to install.</p>
      </div>
      <QRCodeImage code={room.code} name={room.name} />
      <div className="lower-actions share-actions">
        <Button icon="share" onClick={onShare}>
          Share invite
        </Button>
        <Button variant="secondary" icon="copy" onClick={copyLink}>
          {copied ? "Link copied" : "Copy link"}
        </Button>
        <Button variant="ghost" onClick={() => navigate(`/room/${room.code}`)}>
          Done sharing
        </Button>
      </div>
    </main>
  );
}
