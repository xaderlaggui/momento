import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Icon } from "@/components/ui";
import WireframeBoard from "@/components/WireframeBoard";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Share from "@/pages/Share";
import RoomDetail from "@/pages/RoomDetail";
import Join from "@/pages/Join";
import Camera from "@/pages/Camera";
import Done from "@/pages/Done";
import NotFound from "@/pages/NotFound";

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function RequireOwner({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (authed === null) return <p className="label p-6">Loading…</p>;
  if (!authed) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function Toggles({ dark, onToggleDark }: { dark: boolean; onToggleDark: () => void }) {
  const navigate = useNavigate();
  return (
    <>
      <button className="wireframe-toggle" onClick={() => navigate("/wireframe")}>
        Wireframe
      </button>
      <button
        className="theme-toggle"
        onClick={onToggleDark}
        aria-label={`Use ${dark ? "light" : "dark"} appearance`}
      >
        <Icon name={dark ? "sun" : "moon"} />
      </button>
    </>
  );
}

export default function App() {
  const location = useLocation();
  const [dark, setDark] = useState(prefersDark);
  const onCamera = /^\/r\/[^/]+\/camera$/.test(location.pathname);

  return (
    <div className={dark ? "app theme-dark" : "app"}>
      <div className="device-shell">
        <Routes>
          <Route
            path="/wireframe"
            element={
              import.meta.env.DEV ? <WireframeBoard close={() => history.back()} /> : <Navigate to="/" replace />
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <RequireOwner>
                <Dashboard />
              </RequireOwner>
            }
          />
          <Route
            path="/room/:id/share"
            element={
              <RequireOwner>
                <Share />
              </RequireOwner>
            }
          />
          <Route
            path="/room/:id"
            element={
              <RequireOwner>
                <RoomDetail />
              </RequireOwner>
            }
          />
          <Route path="/r/:code" element={<Join />} />
          <Route path="/r/:code/camera" element={<Camera />} />
          <Route path="/r/:code/done" element={<Done />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!onCamera && <Toggles dark={dark} onToggleDark={() => setDark(!dark)} />}
    </div>
  );
}
