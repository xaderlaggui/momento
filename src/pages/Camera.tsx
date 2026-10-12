import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase, SHOTS_PER_ROLL } from "@/lib/supabase";
import { signedUrl } from "@/lib/api";
import { describe } from "@/lib/errors";
import {
  countKept,
  discardPhoto,
  getRoomId,
  keepPhoto,
  loadGuestSession,
  resumeMember,
  submitPending,
} from "@/lib/guest";
import type { Member, Photo } from "@/lib/types";
import { Button, Counter, Flick, Icon } from "@/components/ui";

const MAX_EDGE = 2048;

function haptic(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* vibration unsupported */
  }
}

function FilmStrip({ photos, urls, keptTotal }: { photos: Photo[]; urls: Record<string, string>; keptTotal: number }) {
  const recent = photos.slice(-3);
  const firstNumber = keptTotal - recent.length + 1;
  return (
    <div className="film-strip">
      {recent.map((p, index) => (
        <div className="film-frame" key={p.id}>
          {urls[p.id] ? <img src={urls[p.id]} alt="" /> : null}
          <span>{String(firstNumber + index).padStart(2, "0")}</span>
        </div>
      ))}
    </div>
  );
}

export default function Camera() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewBlobRef = useRef<Blob | null>(null);
  const uploadedUrlRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const session = loadGuestSession(code);
  const [member, setMember] = useState<Member | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [kept, setKept] = useState(0);
  const [strip, setStrip] = useState<Photo[]>([]);
  const [stripUrls, setStripUrls] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; storagePath: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [showFlick, setShowFlick] = useState(false);
  const [camError, setCamError] = useState(false);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [firstShot, setFirstShot] = useState(true);
  const [gridOn, setGridOn] = useState(false);
  const [timer, setTimer] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const countdownRef = useRef<number | null>(null);

  // Restore grid/timer choices; they persist across visits.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("momento.camera.prefs");
      if (raw) {
        const p = JSON.parse(raw) as { grid?: boolean; timer?: number };
        if (typeof p.grid === "boolean") setGridOn(p.grid);
        if (typeof p.timer === "number") setTimer(p.timer);
      }
    } catch {
      /* corrupt prefs → defaults */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("momento.camera.prefs", JSON.stringify({ grid: gridOn, timer }));
  }, [gridOn, timer]);

  useEffect(
    () => () => {
      if (countdownRef.current) window.clearInterval(countdownRef.current);
    },
    []
  );

  // Init: verify session, load room id, kept count, and any orphan pending shot.
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const m = await resumeMember(code);
        const rid = await getRoomId(code);
        const keptCount = await countKept(m.id);
        if (keptCount >= SHOTS_PER_ROLL) {
          navigate(`/r/${code}/done`, { replace: true });
          return;
        }
        setMember(m);
        setRoomId(rid);
        setKept(keptCount);
        setReady(true);
        const { data: pendingRow } = await supabase
          .from("photos")
          .select("*")
          .eq("member_id", m.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pendingRow) {
          setPreviewUrl(await signedUrl(pendingRow.storage_path));
          setPending({ id: pendingRow.id, storagePath: pendingRow.storage_path });
        }
      } catch (e) {
        setError(describe(e));
      }
    })();
  }, [code, navigate, session]);

  // Camera stream. A party booth is shot at people, so the front camera leads;
  // the flip button swaps lenses without leaving the screen.
  useEffect(() => {
    if (!ready) return;
    let live = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 } },
          audio: false,
        });
        if (!live) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        setTorchAvailable(!!caps?.torch);
        setTorchOn(false);
      } catch {
        if (live) setCamError(true);
      }
    })();
    return () => {
      live = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [ready, facing]);

  const grabBlob = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video) return reject(new Error("Camera not ready"));
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return reject(new Error("Camera not ready"));
      const scale = Math.min(1, MAX_EDGE / Math.max(vw, vh));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      if (facing === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Capture failed"))),
        "image/jpeg",
        0.85
      );
    });
  }, [facing]);

  // Resolve signed URLs for the film strip.
  useEffect(() => {
    if (strip.length === 0) return;
    let live = true;
    Promise.all(strip.map(async (p) => [p.id, await signedUrl(p.storage_path)] as const)).then(
      (entries) => live && setStripUrls(Object.fromEntries(entries))
    );
    return () => {
      live = false;
    };
  }, [strip]);

  function clearPreview() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPending(null);
    previewBlobRef.current = null;
    uploadedUrlRef.current = null;
  }

  async function captureNow() {
    setError(null);
    haptic(12);
    try {
      previewBlobRef.current = await grabBlob();
      setPreviewUrl(URL.createObjectURL(previewBlobRef.current));
      setFirstShot(false);
    } catch (e) {
      setError(describe(e));
    }
  }

  function startCountdown(seconds: number) {
    setCountdown(seconds);
    haptic(8);
    let remaining = seconds;
    countdownRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownRef.current) window.clearInterval(countdownRef.current);
        countdownRef.current = null;
        setCountdown(null);
        void captureNow();
      } else {
        setCountdown(remaining);
        haptic(8);
      }
    }, 1000);
  }

  function onShutter() {
    if (busy || previewUrl || countdown !== null) return;
    if (timer > 0) startCountdown(timer);
    else void captureNow();
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  }

  // Do not auto-upload on capture: upload only when user taps "Keep photo".

  async function onKeep() {
    if (!member || !roomId) return;
    const blob = previewBlobRef.current;
    if (!blob && !pending) return;
    setBusy(true);
    setError(null);
    try {
      let pid = pending?.id;
      let pPath = pending?.storagePath;
      if (!pid) {
        if (!blob) return;
        const p = await submitPending(code, roomId, member.id, blob);
        pid = p.id;
        pPath = p.storagePath;
        setPending(p);
      }
      await keepPhoto(pid);
      const next = kept + 1;
      setKept(next);
      setStrip((s) => [
        ...s,
        {
          id: pid,
          room_id: member.room_id,
          member_id: member.id,
          storage_path: pPath,
          status: "kept",
          created_at: new Date().toISOString(),
        } as Photo,
      ]);
      clearPreview();
      setFlash(true);
      setShowFlick(true);
      haptic([10, 40, 10]);
      setTimeout(() => setFlash(false), 120);
      setTimeout(() => setShowFlick(false), 850);
      if (next >= SHOTS_PER_ROLL) navigate(`/r/${code}/done`, { replace: true });
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRetake() {
    if (pending) await discardPhoto(pending.id, pending.storagePath).catch(() => undefined);
    clearPreview();
  }

  if (!session) return <Navigate to={`/r/${code}`} replace />;

  const full = kept >= SHOTS_PER_ROLL;

  if (previewUrl) {
    return (
      <main className="screen camera-screen preview-screen">
        <img className="viewfinder-image" src={previewUrl} alt="Photo preview" />
        <div className="preview-vignette" />
        <div className="preview-label">{busy ? "SAVING…" : "LOOKS GOOD"}</div>
        {error && <p style={{ position: "absolute", top: "20%", left: 0, right: 0, textAlign: "center", color: "#ff715b", fontSize: 13 }}>{error}</p>}
        <div className="preview-actions">
          <Button variant="secondary" onClick={onRetake} disabled={busy}>
            Retake
          </Button>
          <Button onClick={onKeep} disabled={busy}>
            {busy ? "Saving…" : "Keep photo"}
          </Button>
        </div>
        {flash && <div className="shutter-flash" />}
      </main>
    );
  }

  return (
    <main className="screen camera-screen">
      {camError ? (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", gap: 16, textAlign: "center", padding: 24 }}>
          <Flick pose="deflated" size="medium" />
          <p style={{ fontSize: 18, fontWeight: 700 }}>Camera blocked</p>
          <p style={{ color: "rgba(255,255,255,.7)" }}>
            Allow camera access in your browser settings, then reopen this page.
          </p>
          <label className="button button--primary" style={{ margin: "0 auto" }}>
            <Icon name="flash" />
            <span>Pick from camera roll</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  previewBlobRef.current = f;
                  setPreviewUrl(URL.createObjectURL(f));
                }
              }}
            />
          </label>
        </div>
      ) : (
        <video
          ref={(el) => {
            videoRef.current = el;
            // The preview screen unmounts this element; on Retake/Keep it
            // remounts with no srcObject, so reattach the still-live stream.
            if (el && streamRef.current) el.srcObject = streamRef.current;
          }}
          className="viewfinder-image"
          autoPlay
          playsInline
          muted
          style={facing === "user" ? { transform: "scaleX(-1)" } : undefined}
        />
      )}

      {!camError && <div className="camera-shade" />}
      <div className="camera-top">
        <button className="camera-close" onClick={() => navigate(`/r/${code}`)}>
          Close
        </button>
        <Counter count={kept} />
      </div>

      {!camError && !previewUrl && (
        <div className="camera-tools">
          {torchAvailable && (
            <button
              className={`camera-tool${torchOn ? " is-on" : ""}`}
              aria-pressed={torchOn}
              onClick={toggleTorch}
            >
              Flash
            </button>
          )}
          <button
            className={`camera-tool${timer > 0 ? " is-on" : ""}`}
            onClick={() => setTimer((t) => (t === 0 ? 3 : t === 3 ? 10 : 0))}
          >
            {timer > 0 ? `Timer ${timer}s` : "Timer off"}
          </button>
          <button
            className={`camera-tool${gridOn ? " is-on" : ""}`}
            aria-pressed={gridOn}
            onClick={() => setGridOn((v) => !v)}
          >
            Grid
          </button>
        </div>
      )}

      {!camError && (
        <button
          className="camera-flip"
          onClick={() => {
            haptic(8);
            setFacing((f) => (f === "user" ? "environment" : "user"));
          }}
          aria-label={`Switch to ${facing === "user" ? "back" : "front"} camera`}
        >
          <Icon name="flip" />
        </button>
      )}

      {!camError && !previewUrl && firstShot && (
        <p className="camera-first-hint">Tap the shutter to start the roll</p>
      )}

      {!camError && !previewUrl && (
        <>
          <div className="bracket bracket--tl" />
          <div className="bracket bracket--tr" />
          <div className="bracket bracket--bl" />
          <div className="bracket bracket--br" />
        </>
      )}

      {gridOn && !camError && !previewUrl && (
        <div className="grid-overlay" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
      )}

      {countdown !== null && (
        <div className="countdown" aria-live="assertive">
          {countdown}
        </div>
      )}

      {!camError && (
        <div className="camera-controls">
          <FilmStrip photos={strip} urls={stripUrls} keptTotal={kept} />
          <button className="shutter" onClick={onShutter} disabled={busy || full} aria-label="Take photo">
            <span />
          </button>
          <p>{full ? "ROLL FULL · HAND IT ON" : "HOLD STILL · TAP TO SHOOT"}</p>
        </div>
      )}

      {error && (
        <p style={{ position: "absolute", bottom: 160, left: 20, right: 20, textAlign: "center", color: "#ff715b", fontSize: 13 }}>
          {error}
        </p>
      )}
      {flash && <div className="shutter-flash" />}
      {showFlick && (
        <div className="hype-pop">
          <Flick pose="hype" size="medium" />
        </div>
      )}
    </main>
  );
}
