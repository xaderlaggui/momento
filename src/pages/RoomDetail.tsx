import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, SHOTS_PER_ROLL } from "@/lib/supabase";
import {
  closeRoom,
  downloadRoomZip,
  getRoom,
  listMembers,
  listRoomPhotos,
  setRoomMax,
  signedUrl,
} from "@/lib/api";
import type { Member, Photo, Room } from "@/lib/types";
import { BackBar, Button, EmptyState, Flick, Icon, Sheet, Skeleton } from "@/components/ui";

function stamp(iso: string): string {
  const d = new Date(iso);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${months[d.getMonth()]} ${d.getDate()} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function RoomDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [sheet, setSheet] = useState<"close" | "download" | "settings" | null>(null);
  const [maxMembers, setMaxMembers] = useState(10);
  const [savingMax, setSavingMax] = useState(false);
  const [zipPct, setZipPct] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const [r, m, p] = await Promise.all([getRoom(id), listMembers(id), listRoomPhotos(id)]);
    setRoom(r);
    setMaxMembers(r.max_members ?? 10);
    setMembers(m);
    setPhotos(p);
  }, [id]);

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, [refresh]);

  // Resolve signed URLs for grid photos.
  useEffect(() => {
    let live = true;
    Promise.all(
      photos.map(async (p) => [p.id, await signedUrl(p.storage_path)] as const)
    ).then((entries) => live && setUrls(Object.fromEntries(entries)));
    return () => {
      live = false;
    };
  }, [photos]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`room-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos", filter: `room_id=eq.${id}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refresh]);

  const keptCounts = photos.reduce<Record<string, number>>((acc, p) => {
    acc[p.member_id] = (acc[p.member_id] ?? 0) + 1;
    return acc;
  }, {});

  const everyRollFull =
    members.length > 0 && members.every((m) => (keptCounts[m.id] ?? 0) >= SHOTS_PER_ROLL);

  async function onClose() {
    setClosing(true);
    try {
      await closeRoom(id);
      setSheet(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setClosing(false);
    }
  }

  async function onSaveMax() {
    if (!room) return;
    setSavingMax(true);
    setError(null);
    try {
      await setRoomMax(room.id, maxMembers);
      setSheet(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingMax(false);
    }
  }

  async function onZip() {
    if (!room) return;
    setError(null);
    setZipPct(0);
    try {
      await downloadRoomZip(room.id, room.name, setZipPct);
      setSheet(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setZipPct(null);
    }
  }

  if (error && !room) return <p style={{ padding: 24, color: "var(--destructive)" }}>{error}</p>;
  if (!room)
    return (
      <main className="screen standard-screen room-screen">
        <BackBar label="Cameras" onBack={() => navigate("/dashboard")} />
        <header className="room-title">
          <div>
            <Skeleton w={110} h={11} />
            <div style={{ marginTop: 10 }}>
              <Skeleton w={190} h={30} />
            </div>
          </div>
          <Skeleton w={64} h={29} r={999} />
        </header>
        <div className="inset-list progress-list" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div className="progress-row" key={i}>
              <div style={{ marginBottom: 10 }}>
                <Skeleton w="42%" h={13} />
              </div>
              <Skeleton w="100%" h={4} r={99} />
            </div>
          ))}
        </div>
        <div className="photo-grid" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="polaroid polaroid--skeleton" key={i} />
          ))}
        </div>
      </main>
    );

  const open = room.status === "open";

  return (
    <main className="screen standard-screen room-screen">
      <BackBar label="Cameras" onBack={() => navigate("/dashboard")} />
      <header className="room-title">
        <div>
          <p className="eyebrow">{open ? "LIVE CAMERA" : "CLOSED CAMERA"}</p>
          <h1>{room.name}</h1>
        </div>
        <span className="live-pill">{open ? <i className="status-dot" /> : null} {open ? "LIVE" : "CLOSED"}</span>
      </header>

      {everyRollFull && (
        <div className="room-banner">
          <Flick pose="cheese" size="small" />
          <div>
            <strong>Every roll is full</strong>
            <span>
              {photos.length} keeps ready to download.
            </span>
          </div>
        </div>
      )}

      <section>
        <div className="section-heading">
          <h2>Guests</h2>
          <span>
            {members.filter((m) => (keptCounts[m.id] ?? 0) > 0).length || members.length} shooting ·{" "}
            {members.length}/{room.max_members} joined
          </span>
        </div>
        {members.length === 0 ? (
          <EmptyState
            flick="wave"
            title="No guests yet"
            hint="Share the QR — guests appear here the moment they join."
          />
        ) : (
          <div className="inset-list progress-list">
            {members.map((m) => {
              const kept = keptCounts[m.id] ?? 0;
              const full = kept >= SHOTS_PER_ROLL;
              return (
                <div className="progress-row" key={m.id}>
                  <div>
                    <strong>{m.display_name}</strong>
                    <code>
                      {String(kept).padStart(2, "0")}/{SHOTS_PER_ROLL}
                    </code>
                  </div>
                  <div className="progress-track">
                    <i className={full ? "is-full" : ""} style={{ transform: `scaleX(${kept / SHOTS_PER_ROLL})` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="section-heading">
          <h2>Latest keeps</h2>
          <span aria-live="polite">{photos.length} total</span>
        </div>
        {photos.length === 0 ? (
          <EmptyState flick="peek" title="No keeps yet" hint="Kept shots land here the second a guest taps Keep." />
        ) : (
          <div className="photo-grid">
            {photos.map((p) => (
              <figure className="polaroid" key={p.id}>
                {urls[p.id] ? (
                  <img src={urls[p.id]} alt={`Kept shot ${p.id}`} loading="lazy" />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "var(--hairline)" }} />
                )}
                <figcaption>{stamp(p.created_at)}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <div className="room-actions">
        {open && (
          <Button variant="secondary" icon="share" onClick={() => navigate(`/room/${room.id}/share`)}>
            Share QR
          </Button>
        )}
        <Button icon="download" onClick={() => setSheet("download")} disabled={zipPct !== null}>
          {zipPct !== null ? `Zipping… ${zipPct}%` : `Download all (${photos.length})`}
        </Button>
        {open ? (
          <Button variant="ghost" onClick={() => setSheet("close")}>
            Close room
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => navigate(`/room/${room.id}/share`)}>
            <Icon name="copy" />
            <span>Share again</span>
          </Button>
        )}
        <Button variant="ghost" onClick={() => setSheet("settings")}>
          <span>Member limit · {room.max_members}</span>
        </Button>
      </div>

      {error && <p style={{ color: "var(--destructive)", fontSize: 13, marginTop: 12 }}>{error}</p>}

      {sheet === "close" && (
        <Sheet title="Close room" onDismiss={() => setSheet(null)}>
          <div className="sheet__mascot">
            <Flick pose="waiting" size="small" />
          </div>
          <div className="sheet__heading">
            <p className="eyebrow">FINAL FRAME</p>
            <h2>Close this room?</h2>
            <p>Guests won’t be able to take more photos. All {photos.length} keeps stay safe.</p>
          </div>
          <Button variant="destructive" onClick={onClose} disabled={closing}>
            {closing ? "Closing…" : "Close room"}
          </Button>
          <Button variant="ghost" onClick={() => setSheet(null)}>
            Keep it open
          </Button>
        </Sheet>
      )}

      {sheet === "download" && (
        <Sheet title="Download" onDismiss={() => setSheet(null)}>
          <div className="sheet__heading">
            <p className="eyebrow">ROLL COMPLETE</p>
            <h2>
              {photos.length} moment{photos.length === 1 ? "" : "s"}, ready.
            </h2>
            <p>Download everything as one tidy zip, grouped by guest.</p>
          </div>
          <Button icon="download" onClick={onZip} disabled={zipPct !== null || photos.length === 0}>
            {zipPct !== null ? `Zipping… ${zipPct}%` : "Download all"}
          </Button>
          <Button variant="ghost" onClick={() => setSheet(null)}>
            Later
          </Button>
        </Sheet>
      )}
      {sheet === "settings" && (
        <Sheet title="Member limit" onDismiss={() => setSheet(null)}>
          <div className="sheet__heading">
            <p className="eyebrow">HEADCOUNT</p>
            <h2>Member limit</h2>
            <p>
              {members.length} joined so far. New guests are blocked once the cap is hit; existing
              guests always keep access.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              margin: "0 4px 20px",
            }}
          >
            <button
              className="icon-button"
              aria-label="Fewer members"
              onClick={() => setMaxMembers((v) => Math.max(1, v - 1))}
              disabled={maxMembers <= 1 || savingMax}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>−</span>
            </button>
            <span className="counter">{maxMembers}</span>
            <button
              className="icon-button"
              aria-label="More members"
              onClick={() => setMaxMembers((v) => Math.min(10, v + 1))}
              disabled={maxMembers >= 10 || savingMax}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
            </button>
          </div>
          <Button onClick={onSaveMax} disabled={savingMax || maxMembers === room.max_members}>
            {savingMax ? "Saving…" : "Save limit"}
          </Button>
          <Button variant="ghost" onClick={() => setSheet(null)}>
            Cancel
          </Button>
        </Sheet>
      )}
    </main>
  );
}
