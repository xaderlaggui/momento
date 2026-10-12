import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRoom, listRooms } from "@/lib/api";
import type { Room } from "@/lib/types";
import { NEW_ROOM_EVENT } from "@/components/BottomNav";
import { Button, EmptyState, Flick, Icon, Sheet, Skeleton, TextField } from "@/components/ui";

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
  const [maxMembers, setMaxMembers] = useState(10);
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

  // The bottom-nav "New" tab opens the create sheet from anywhere on the tab.
  useEffect(() => {
    const open = () => setSheetOpen(true);
    window.addEventListener(NEW_ROOM_EVENT, open);
    return () => window.removeEventListener(NEW_ROOM_EVENT, open);
  }, []);

  async function onCreate() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const room = await createRoom(name.trim(), date || null, maxMembers);
      setSheetOpen(false);
      navigate(`/room/${room.code}/share`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen standard-screen">
      <header className="large-header">
        <div>
          <p className="eyebrow">MOMENTO HOST</p>
          <h1>Your cameras</h1>
        </div>
        <button className="icon-button" onClick={() => navigate("/account")} aria-label="Account">
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
        {rooms === null ? (
          <div className="inset-list" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div className="room-row" key={i}>
                <Skeleton w={48} h={48} r={14} />
                <span className="room-row__copy">
                  <Skeleton w="62%" h={13} />
                  <Skeleton w="38%" h={10} />
                </span>
                <Skeleton w={34} h={10} />
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            flick="peek"
            title="No cameras yet"
            hint="Tap New room below, then share the QR. Everyone shoots into the same roll."
          />
        ) : (
          <div className="inset-list">
            {rooms.map((room) => (
              <button className="room-row" key={room.id} onClick={() => navigate(`/room/${room.code}`)}>
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
            ))}
          </div>
        )}
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
          <div className="field">
            <span>Max members</span>
            <div className="member-stepper">
              <button
                className="icon-button"
                aria-label="Fewer members"
                onClick={() => setMaxMembers((v) => Math.max(1, v - 1))}
                disabled={maxMembers <= 1}
              >
                <span className="member-stepper__sign">−</span>
              </button>
              <span className="counter">{maxMembers}</span>
              <button
                className="icon-button"
                aria-label="More members"
                onClick={() => setMaxMembers((v) => Math.min(10, v + 1))}
                disabled={maxMembers >= 10}
              >
                <span className="member-stepper__sign">+</span>
              </button>
            </div>
          </div>
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
