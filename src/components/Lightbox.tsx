import { useEffect } from "react";
import { Icon } from "@/components/ui";
import { triggerDownload } from "@/lib/api";

export interface LightboxItem {
  url: string;
  caption: string;
  filename: string;
}

/** Full-screen photo viewer with keyboard and swipe-free prev/next. */
export default function Lightbox({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onIndex: (next: number) => void;
}) {
  const item = items[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex(Math.min(items.length - 1, index + 1));
      if (e.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onIndex]);

  if (!item) return null;

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
      <div className="lightbox__bar" onClick={(e) => e.stopPropagation()}>
        <span className="lightbox__count">
          {index + 1} / {items.length}
        </span>
        <div className="lightbox__actions">
          <button
            className="icon-button"
            aria-label="Download photo"
            onClick={() => triggerDownload(item.url, item.filename)}
          >
            <Icon name="download" />
          </button>
          <button className="icon-button" aria-label="Close viewer" onClick={onClose}>
            <Icon name="back" />
          </button>
        </div>
      </div>

      <img className="lightbox__img" src={item.url} alt={item.caption} onClick={(e) => e.stopPropagation()} />

      {index > 0 && (
        <button
          className="lightbox__nav lightbox__nav--prev"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            onIndex(index - 1);
          }}
        >
          ‹
        </button>
      )}
      {index < items.length - 1 && (
        <button
          className="lightbox__nav lightbox__nav--next"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation();
            onIndex(index + 1);
          }}
        >
          ›
        </button>
      )}
      <p className="lightbox__caption">{item.caption}</p>
    </div>
  );
}
