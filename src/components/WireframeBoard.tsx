type WireType = "form" | "list" | "sheet" | "qr" | "grid" | "camera" | "preview" | "done" | "empty";

const wireScreens: Array<{
  group: "HOST" | "GUEST" | "SYSTEM";
  step: string;
  title: string;
  type: WireType;
  action: string;
}> = [
  { group: "HOST", step: "01", title: "Sign in", type: "form", action: "Send magic link" },
  { group: "HOST", step: "02", title: "Dashboard", type: "list", action: "New room" },
  { group: "HOST", step: "03", title: "New room", type: "sheet", action: "Create room" },
  { group: "HOST", step: "04", title: "Share", type: "qr", action: "Done sharing" },
  { group: "HOST", step: "05", title: "Live room", type: "grid", action: "Download all" },
  { group: "HOST", step: "06", title: "Close room", type: "sheet", action: "Close room" },
  { group: "GUEST", step: "01", title: "Join", type: "form", action: "Join & open camera" },
  { group: "GUEST", step: "02", title: "Camera", type: "camera", action: "Shutter" },
  { group: "GUEST", step: "03", title: "Preview", type: "preview", action: "Keep photo" },
  { group: "GUEST", step: "04", title: "Saving", type: "camera", action: "Auto-return" },
  { group: "GUEST", step: "05", title: "Roll finished", type: "done", action: "Done" },
  { group: "SYSTEM", step: "—", title: "Dead ends", type: "empty", action: "Try another code" },
];

function WireContent({ type }: { type: WireType }) {
  if (type === "qr") {
    return (
      <div className="wf-qr-block">
        <div className="wf-qr-placeholder">QR</div>
        <div className="wf-chip">MT-0621</div>
        <div className="wf-line wf-line--short" />
      </div>
    );
  }
  if (type === "grid") {
    return (
      <>
        <div className="wf-section-label">Guests</div>
        <div className="wf-list-mini">
          <i />
          <i />
          <i />
        </div>
        <div className="wf-section-label">Latest keeps</div>
        <div className="wf-grid-mini">
          {Array.from({ length: 6 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
      </>
    );
  }
  if (type === "camera" || type === "preview") {
    return (
      <div className="wf-camera-block">
        <span>EXP 07/20</span>
        <div className="wf-focus-frame" />
        {type === "camera" ? (
          <div className="wf-shutter" />
        ) : (
          <div className="wf-preview-buttons">
            <i />
            <i />
          </div>
        )}
      </div>
    );
  }
  if (type === "list") {
    return (
      <>
        <div className="wf-hero-mini" />
        <div className="wf-section-label">Active</div>
        <div className="wf-list-mini wf-list-mini--rooms">
          <i />
          <i />
        </div>
      </>
    );
  }
  if (type === "done" || type === "empty") {
    return (
      <div className="wf-empty-block">
        <div className="wf-mascot-placeholder">FLICK</div>
        <div className="wf-line wf-line--title" />
        <div className="wf-line" />
        <div className="wf-line wf-line--short" />
      </div>
    );
  }
  return (
    <>
      <div className="wf-mascot-dot">FLICK</div>
      <div className="wf-line wf-line--title" />
      <div className="wf-line wf-line--short" />
      <div className="wf-field-mini" />
      {type === "sheet" && <div className="wf-field-mini" />}
    </>
  );
}

export default function WireframeBoard({ close }: { close: () => void }) {
  return (
    <main className="wireframe-board">
      <header className="wireframe-header">
        <div>
          <p>MOMENTO · LOW-FIDELITY WIREFRAME · V1</p>
          <h1>One action. One moment.</h1>
          <span>Mobile baseline 390 × 844 · same single-column structure through 768px</span>
        </div>
        <button onClick={close}>Return to prototype</button>
      </header>

      <section className="wire-flow">
        <div className="wire-flow__label">
          <strong>GUEST</strong>
          <span>First shot in ~10 sec</span>
        </div>
        <div className="wire-flow__steps">
          <b>Scan QR</b>
          <i>→</i>
          <b>Join</b>
          <em>1 tap</em>
          <i>→</i>
          <b>Shoot</b>
          <em>1 tap</em>
          <i>→</i>
          <b>Keep ×20</b>
          <em>20 taps</em>
          <i>→</i>
          <b>Done</b>
        </div>
      </section>
      <section className="wire-flow">
        <div className="wire-flow__label">
          <strong>OWNER</strong>
          <span>Never stacks 2 deep</span>
        </div>
        <div className="wire-flow__steps">
          <b>Create</b>
          <em>2 taps</em>
          <i>→</i>
          <b>Share QR</b>
          <em>1 tap</em>
          <i>→</i>
          <b>Live grid</b>
          <i>→</i>
          <b>Close</b>
          <em>2 taps</em>
          <i>→</i>
          <b>Download</b>
        </div>
      </section>

      <div className="wireframe-section-title">
        <div>
          <span>01</span>
          <h2>Screen map</h2>
        </div>
        <p>
          Every primary action stays in the lower thumb zone. Dashed lines mark the 44pt status and
          34pt home-indicator safe areas.
        </p>
      </div>
      <section className="wireframe-grid">
        {wireScreens.map((item) => (
          <article className="wire-card" key={`${item.group}-${item.title}`}>
            <div className="wire-card__meta">
              <span>
                {item.group} · {item.step}
              </span>
              <strong>{item.title}</strong>
            </div>
            <div className={`wire-phone wire-phone--${item.type}`}>
              <div className="wf-safe wf-safe--top" />
              <div className="wf-nav">
                <i />
                <span>{item.title}</span>
                <i />
              </div>
              <div className="wf-body">
                <WireContent type={item.type} />
              </div>
              <div className="wf-primary">{item.action}</div>
              <div className="wf-safe wf-safe--bottom" />
            </div>
            <p>
              {item.type === "sheet" ? "Bottom sheet · 16px corners · grabber" : "Single obvious next action"}
            </p>
          </article>
        ))}
      </section>

      <div className="wireframe-section-title">
        <div>
          <span>02</span>
          <h2>Component anatomy</h2>
        </div>
        <p>Reusable parts scale from the 390px baseline without introducing a desktop layout.</p>
      </div>
      <section className="wire-components">
        <div>
          <span>BUTTONS</span>
          <i className="wc-button">Primary · 52h</i>
          <i className="wc-button wc-button--outline">Secondary</i>
          <i className="wc-button wc-button--dark">Destructive</i>
        </div>
        <div>
          <span>INPUT</span>
          <i className="wc-field">
            Label
            <br />
            <b>Field value</b>
          </i>
          <small>16px radius · 54h · focus ring</small>
        </div>
        <div>
          <span>COUNTER</span>
          <i className="wc-chip">EXP 07/20</i>
          <small>Mono · tabular · always visible</small>
        </div>
        <div>
          <span>PHOTO CARD</span>
          <i className="wc-photo">
            <b>IMAGE</b>
            <em>JUN 21 · 10:42</em>
          </i>
          <small>3 cols → 4 cols at 768</small>
        </div>
        <div>
          <span>FLICK</span>
          <i className="wc-flick">IDLE</i>
          <small>Corner support · never over camera</small>
        </div>
      </section>
      <footer className="wireframe-notes">
        <strong>Interaction notes</strong>
        <span>Keep returns directly to live camera</span>
        <span>Permission requested only on Join tap</span>
        <span>Returning guests bypass name</span>
        <span>Retakes never consume exposure</span>
        <span>20/20 advances automatically</span>
      </footer>
    </main>
  );
}
