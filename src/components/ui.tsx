import type { ReactNode } from "react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { inviteLink } from "@/lib/api";

export type IconName =
  | "back"
  | "chevron"
  | "copy"
  | "download"
  | "flash"
  | "flip"
  | "moon"
  | "share"
  | "sun"
  | "user";

export function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    back: <path d="m15 18-6-6 6-6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    copy: (
      <>
        <rect x="9" y="9" width="10" height="10" rx="2" />
        <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
        <path d="M5 19h14" />
      </>
    ),
    flash: <path d="M13 2 6 13h6l-1 9 7-12h-6l1-8Z" />,
    flip: (
      <>
        <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
        <path d="M19.5 3.5v4h-4" />
      </>
    ),
    moon: <path d="M20 15.4A8 8 0 0 1 8.6 4 8 8 0 1 0 20 15.4Z" />,
    share: (
      <>
        <path d="M12 14V4m0 0 4.2 4.2M12 4 7.8 8.2" />
        <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>
    ),
  };
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export function Button({
  children,
  variant = "primary",
  onClick,
  icon,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  onClick?: () => void;
  icon?: IconName;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      className={`button button--${variant}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {icon && <Icon name={icon} />}
      <span>{children}</span>
    </button>
  );
}

export function TextField({
  label,
  placeholder,
  autoFocus,
  type = "text",
  value,
  onChange,
  autoComplete,
  autoCapitalize,
  spellCheck,
}: {
  label: string;
  placeholder: string;
  autoFocus?: boolean;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  autoComplete?: string;
  autoCapitalize?: string;
  spellCheck?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
      />
    </label>
  );
}

export type FlickPose =
  | "idle"
  | "hype"
  | "waiting"
  | "peek"
  | "wave"
  | "cheese"
  | "finished"
  | "deflated";

export function Flick({
  pose = "idle",
  size = "large",
}: {
  pose?: FlickPose;
  size?: "small" | "medium" | "large";
}) {
  const armsUp = pose === "hype" || pose === "cheese";
  const isDeflated = pose === "deflated";
  const isFinished = pose === "finished";
  const isWave = pose === "wave";
  const isPeek = pose === "peek";
  const isCheese = pose === "cheese";
  const bigLens = pose === "hype" || isCheese;
  const smile = isFinished || isWave;

  return (
    <svg
      className={`flick flick--${size} flick--${pose}`}
      viewBox="0 0 160 150"
      role="img"
      aria-label={`Flick the camera mascot, ${pose}`}
    >
      <g className="flick__lever">
        <path
          d="M100 31V17h30v13"
          fill="var(--accent)"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M109 17V9h13v8"
          fill="var(--surface)"
          stroke="var(--ink)"
          strokeWidth="3"
        />
      </g>
      {!isDeflated && (
        <>
          <path
            className="flick__arm flick__arm--left"
            d={armsUp ? "M29 79 8 52" : isPeek ? "M30 84 14 58" : "M28 89 10 98"}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            className="flick__arm flick__arm--right"
            d={armsUp ? "M132 79l20-27" : isWave ? "M133 84l20-24" : "M132 89l17 9"}
            fill="none"
            stroke="var(--ink)"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </>
      )}
      <path
        d={
          isDeflated
            ? "M33 50Q78 58 127 50v70q-44 11-94 0Z"
            : "M28 39h104a12 12 0 0 1 12 12v68a13 13 0 0 1-13 13H29a13 13 0 0 1-13-13V51a12 12 0 0 1 12-12Z"
        }
        fill="var(--mascot-cream)"
        stroke="var(--ink)"
        strokeWidth="3"
      />
      <path
        d="M17 56h126v25H17z"
        fill="var(--accent)"
        stroke="var(--ink)"
        strokeWidth="3"
      />
      <circle cx="88" cy="88" r={bigLens ? "34" : "30"} fill="var(--ink)" />
      <circle cx="88" cy="88" r={bigLens ? "24" : "20"} fill="var(--surface)" />
      {!isDeflated && (
        <circle cx={isPeek ? "97" : "94"} cy="82" r={bigLens ? "11" : "8"} fill="var(--ink)" />
      )}
      {!isDeflated && (
        <circle
          cx="38"
          cy="60"
          r="9"
          fill="var(--surface)"
          stroke="var(--ink)"
          strokeWidth="3"
        />
      )}
      {isFinished && (
        <path
          d="M70 117q15 15 30 0"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {isFinished && (
        <path
          d="M83 123q7 14 14 0"
          fill="var(--destructive)"
          stroke="var(--ink)"
          strokeWidth="2"
        />
      )}
      {smile && !isFinished && (
        <path
          d="M72 117q16 14 32 0"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {isCheese && (
        <>
          <path
            d="M66 111q22 27 44 0q-22 11 -44 0Z"
            fill="var(--ink)"
            stroke="var(--ink)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <ellipse cx="88" cy="117" rx="7" ry="5" fill="var(--destructive)" />
        </>
      )}
      {isDeflated && (
        <>
          <path d="M61 113h53" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
          <path d="M41 66 32 75m0-9 9 9" stroke="var(--ink)" strokeWidth="3" />
        </>
      )}
      <path
        d="M43 132v8m74-8v8"
        stroke="var(--ink)"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Skeleton({
  w = "100%",
  h = 16,
  r = 8,
}: {
  w?: string | number;
  h?: string | number;
  r?: number;
}) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r }} aria-hidden="true" />;
}

export function EmptyState({
  flick = "peek",
  title,
  hint,
  children,
}: {
  flick?: FlickPose;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Flick pose={flick} size="medium" />
      <h2>{title}</h2>
      {hint && <p>{hint}</p>}
      {children}
    </div>
  );
}

export function Counter({ count }: { count: number }) {
  return (
    <span className={`counter ${count >= 20 ? "counter--full" : ""}`} aria-live="polite">
      EXP {String(count).padStart(2, "0")}/20
    </span>
  );
}

export function BackBar({
  label,
  onBack,
}: {
  label: string;
  onBack: () => void;
}) {
  return (
    <div className="backbar">
      <button className="back-link" onClick={onBack} aria-label={`Back to ${label}`}>
        <Icon name="back" />
        {label}
      </button>
      <span className="wordmark">MOMENTO</span>
      <span className="backbar__spacer" />
    </div>
  );
}

export function Sheet({
  title,
  children,
  onDismiss,
}: {
  title: string;
  children: ReactNode;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Mount-only: re-running this steals focus from whatever the user is
  // typing into, so parents can pass a fresh onDismiss each render.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissRef.current();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="sheet-layer" role="presentation" onMouseDown={onDismiss}>
      <section
        ref={ref}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet__grabber" />
        {children}
      </section>
    </div>
  );
}

export function QRCodeImage({ code, name }: { code: string; name: string }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(inviteLink(code), {
      width: 540,
      margin: 1,
      color: { dark: "#2b241d", light: "#fffdf7" },
    }).then((url) => live && setDataUrl(url));
    return () => {
      live = false;
    };
  }, [code]);

  return (
    <section className="qr-card">
      <div className="qr-card__label">
        <span className="status-dot" /> {name.toUpperCase()}
      </div>
      {dataUrl ? (
        <img className="qr" src={dataUrl} alt={`QR code for room ${name}`} />
      ) : (
        <div className="qr" style={{ margin: "18px auto", minHeight: 200 }} />
      )}
      <code className="room-code">{code}</code>
      <p>{inviteLink(code)}</p>
    </section>
  );
}
