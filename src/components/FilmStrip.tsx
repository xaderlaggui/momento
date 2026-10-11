import { useEffect, useMemo, useState } from "react";
import { signedUrl } from "@/lib/api";
import type { Photo } from "@/lib/types";

export function FilmStrip({ photos }: { photos: Photo[] }) {
  const recent = useMemo(() => photos.slice(-3), [photos]);
  const tilts = useMemo(() => recent.map(() => (Math.random() * 6 - 3).toFixed(1)), [recent]);
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    Promise.all(recent.map((p) => signedUrl(p.storage_path))).then((u) => live && setUrls(u));
    return () => {
      live = false;
    };
  }, [recent]);

  if (recent.length === 0) return <div className="h-14" />;

  return (
    <div className="flex h-14 items-center justify-center gap-2" aria-label="Recent kept shots">
      {recent.map((p, i) => (
        <div
          key={p.id}
          className="h-12 w-12 rounded-sm border-2 border-white bg-surface bg-cover bg-center shadow dark:border-neutral-600"
          style={{
            backgroundImage: urls[i] ? `url(${urls[i]})` : undefined,
            transform: `rotate(${tilts[i]}deg)`,
          }}
        />
      ))}
    </div>
  );
}
