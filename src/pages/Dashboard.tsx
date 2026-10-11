import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRoom, listRooms } from "@/lib/api";
import type { Room } from "@/lib/types";
import { Button, Flick, Icon, Sheet, TextField } from "@/components/ui";

async function keptCount(roomId: string): Promise<number> {
  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("status", "kept");
  return count ?? 0;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const list = await listRooms();
    setRooms(list);
    const entries = await Promise.all(list.map(async (r) => [r.id, await keptCount(r.id)] as const));
    setCounts(Object.fromEntries(entries));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const room = await createRoom(name.trim(), date || null);
      setSheetOpen(false);
      navigate(`/room/${room.id}/share`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <main className="screen standard-screen">
      <header className="large-header">
        <div>
          <p className="eyebrow">MOMENTO HOST</p>
          <h1>Your cameras</h1>
        </div>
        <button className="icon-button" onClick={onSignOut} aria-label="Account — sign out">
          <Icon name="user" />
        </button>
      </header>

      <section className="dashboard-hero">
        <Flick pose="idle" size="medium" />
        <div>
          <p className="hero-kicker">Ready to roll</p>
          <p>Create a room, share the QR, watch the keeps land here live.</p>
        </div>
      </section>

      <section>
        <div className="section-heading">
          <h2>Active</h2>
          <span>{rooms?.length ?? 0} cameras</span>
        </div>
        <div className="inset-list">
          {rooms === null ? (
            <div className="room-row">
              <span className="room-row__copy">
                <small>Loading…</small>
              </span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="room-row">
              <span className="room-row__copy">
                <strong>No cameras yet</strong>
                <small>Create your first room below.</small>
              </span>
            </div>
          ) : (
            rooms.map((room) => (
              <button className="room-row" key={room.id} onClick={() => navigate(`/room/${room.id}`)}>
                <span className="room-row__icon">
                  <Icon name="flash" />
                </span>
                <span className="room-row__copy">
                  <strong>{room.name}</strong>
                  <small>
                    {room.status === "open" ? <i className="status-dot" /> : null}
                    {room.status === "open" ? "Open" : "Closed"} · {counts[room.id] ?? 0} keeps
                  </small>
                </span>
                <span className="room-row__meta">
                  <code>{room.code}</code>
                  <Icon name="chevron" />
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="flow-note">
        <span className="flow-note__number">02</span>
        <div>
          <strong>Host flow</strong>
          <p>Create → share in two taps. Photos arrive here live.</p>
        </div>
      </section>

      <div className="lower-actions">
        <Button onClick={() => setSheetOpen(true)}>New room</Button>
      </div>

      {sheetOpen && (
        <Sheet title="New room" onDismiss={() => setSheetOpen(false)}>
          <div className="sheet__heading">
            <p className="eyebrow">A FRESH ROLL</p>
            <h2>New room</h2>
            <p>Name it now. You can invite everyone next.</p>
          </div>
          <TextField label="Room name" placeholder="Maya & Theo" value={name} onChange={setName} />
          <TextField label="Event date (optional)" type="date" value={date} onChange={setDate} placeholder="" />
          {error && <p style={{ color: "var(--destructive)", fontSize: 13 }}>{error}</p>}
          <Button onClick={onCreate} disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create room"}
          </Button>
          <Button variant="ghost" onClick={() => setSheetOpen(false)}>
            Cancel
          </Button>
        </Sheet>
      )}
    </main>
  );
}
