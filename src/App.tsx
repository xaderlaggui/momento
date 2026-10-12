import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Icon } from "@/components/ui";
import BottomNav, { bottomNavVariant } from "@/components/BottomNav";
import Splash from "@/components/Splash";
import Dashboard from "@/pages/Dashboard";
import Share from "@/pages/Share";
import RoomDetail from "@/pages/RoomDetail";
import Join from "@/pages/Join";
import Camera from "@/pages/Camera";
import Done from "@/pages/Done";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import ResetPassword from "@/pages/ResetPassword";
import Account from "@/pages/Account";
import NotFound from "@/pages/NotFound";

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function RequireOwner({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Host screens need a real host session. Guests sign in anonymously
  // (src/lib/guest.ts), so an anonymous session is not host access.
  const isHost = (session: { user?: { is_anonymous?: boolean } } | null) =>
    !!session && session.user?.is_anonymous !== true;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(isHost(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setAuthed(isHost(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (authed === null) return <p className="label p-6">Loading…</p>;
  if (!authed) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Toggles({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  return (
    <button
      className="theme-toggle"
      onClick={onToggleDark}
      aria-label={`Use ${dark ? "light" : "dark"} appearance`}
    >
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}

export default function App() {
  const location = useLocation();
  const [dark, setDark] = useState(prefersDark);
  const onCamera = /^\/r\/[^/]+\/camera$/.test(location.pathname);
  const nav = bottomNavVariant(location.pathname);

  return (
    <div className={`app${dark ? " theme-dark" : ""}${nav ? " has-nav" : ""}`}>
      <div className="device-shell">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/join" element={<Navigate to="/" replace />} />
          <Route path="/r" element={<Navigate to="/" replace />} />
          <Route
            path="/dashboard"
            element={
              <RequireOwner>
                <Dashboard />
              </RequireOwner>
            }
          />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/reset" element={<ResetPassword />} />
          <Route
            path="/room/:code/share"
            element={
              <RequireOwner>
                <Share />
              </RequireOwner>
            }
          />
          <Route
            path="/room/:code"
            element={
              <RequireOwner>
                <RoomDetail />
              </RequireOwner>
            }
          />
          <Route
            path="/account"
            element={
              <RequireOwner>
                <Account dark={dark} onToggleDark={() => setDark(!dark)} />
              </RequireOwner>
            }
          />
          <Route path="/r/:code" element={<Join />} />
          <Route path="/r/:code/camera" element={<Camera />} />
          <Route path="/r/:code/done" element={<Done />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
        <Splash />
      </div>
      {!onCamera && <Toggles dark={dark} onToggleDark={() => setDark(!dark)} />}
    </div>
  );
}
