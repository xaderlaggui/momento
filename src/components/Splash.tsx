import { useEffect, useState } from "react";
import { Flick } from "@/components/ui";

/**
 * Cold-launch opening animation: Flick waves over the paper ground while the
 * session check runs behind it, then the shutter "opens" to reveal the route.
 * Honors prefers-reduced-motion with a short fade instead.
 */
export default function Splash() {
  const [out, setOut] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reduce ? 250 : 900;
    const fade = reduce ? 200 : 440;
    const t1 = window.setTimeout(() => setOut(true), hold);
    const t2 = window.setTimeout(() => setGone(true), hold + fade);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div className={`splash${out ? " is-out" : ""}`} aria-hidden="true">
      <div className="splash__brand">
        <Flick pose="wave" size="large" />
        <span className="wordmark">MOMENTO</span>
      </div>
    </div>
  );
}
