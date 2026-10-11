import { useEffect, useState } from "react";
import { signedUrl } from "@/lib/api";
import type { Photo } from "@/lib/types";

export function PhotoCard({ path, stamp }: { path: string; stamp?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [rotation] = useState(() => (Math.random() * 4 - 2).toFixed(1));

  useEffect(() => {
    let live = true;
    signedUrl(path).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [path]);

  return (
    <div
      className="relative aspect-square overflow-hidden rounded-md border-4 border-white bg-surface shadow-sm dark:border-neutral-700"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full animate-pulse bg-line/40" />
      )}
      {stamp && (
        <span className="absolute bottom-1 right-1 font-mono text-[10px] uppercase tracking-wide text-accent drop-shadow">
          {stamp}
        </span>
      )}
    </div>
  );
}

function dateStamp(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}.${d.getFullYear()}`;
}

export function PhotoGrid({ photos }: { photos: Photo[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 p-1 sm:grid-cols-4">
      {photos.map((p) => (
        <PhotoCard key={p.id} path={p.storage_path} stamp={dateStamp(p.created_at)} />
      ))}
    </div>
  );
}
