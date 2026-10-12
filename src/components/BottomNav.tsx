import { useLocation, useNavigate } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui";

/** Event the Dashboard listens for to open the New-room sheet. */
export const NEW_ROOM_EVENT = "momento:new";

type Tab = { key: string; label: string; icon: IconName; to?: string; onClick?: () => void };

/**
 * Which bottom bar a path should show, if any. The guest camera is immersive,
 * so it is deliberately excluded.
 */
export function bottomNavVariant(pathname: string): "host" | "guest" | null {
  if (/^\/(dashboard|account|room\/)/.test(pathname)) return "host";
  if (/^\/r\/[^/]+(\/done)?$/.test(pathname)) return "guest";
  return null;
}

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const variant = bottomNavVariant(pathname);
  if (!variant) return null;

  const isActive = (tab: Tab) => !!tab.to && (pathname === tab.to || pathname.startsWith(`${tab.to}/`));
  const go = (tab: Tab) => {
    if (tab.onClick) tab.onClick();
    else if (tab.to) navigate(tab.to);
  };

  const hostTabs: Tab[] = [
    { key: "cameras", label: "CAMERAS", icon: "grid", to: "/dashboard" },
    { key: "new", label: "NEW", icon: "plus", onClick: () => window.dispatchEvent(new Event(NEW_ROOM_EVENT)) },
    { key: "account", label: "ACCOUNT", icon: "settings", to: "/account" },
  ];

  const code = pathname.split("/")[2] ?? "";
  const guestTabs: Tab[] = [
    { key: "camera", label: "CAMERA", icon: "camera", to: `/r/${code}/camera` },
    { key: "done", label: "DONE", icon: "check", to: `/r/${code}/done` },
  ];

  const tabs = variant === "host" ? hostTabs : guestTabs;

  return (
    <nav className={`bottomnav bottomnav--${variant}`} aria-label={variant === "host" ? "Host" : "Camera"}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`bottomnav__tab${isActive(tab) ? " is-active" : ""}`}
          aria-current={isActive(tab) ? "page" : undefined}
          onClick={() => go(tab)}
        >
          <Icon name={tab.icon} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
